// Bộ lọc dashboard: đọc từ URL searchParams → dựng mệnh đề WHERE + tham số.
//
// Thuần, không đụng DB/mạng — test được. Dùng chung cho mọi dashboard cần lọc,
// nên các dashboard sau chỉ khai báo cột nào lọc theo chiều nào, không viết lại
// logic dựng WHERE.

/** Một chiều lọc: khoá trên URL ↔ cột trong bảng. */
export type ChieuLoc = {
  khoa: string; // tên tham số URL, vd "tram"
  cot: string; // tên cột trong bảng, vd "tram"
};

export type Loc = {
  tu?: string; // YYYY-MM-DD
  den?: string;
  /** Giá trị đã chọn theo từng chiều: { tram: ["V52…"], nhom: [...] } */
  chon: Record<string, string[]>;
};

const NGAY = /^\d{4}-\d{2}-\d{2}$/;

/** searchParams (đã await) → Loc. Giá trị nhiều chọn ngăn nhau bằng "~". */
export function docLoc(
  sp: Record<string, string | string[] | undefined>,
  chieu: ChieuLoc[]
): Loc {
  const lay = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const tu = lay("tu");
  const den = lay("den");
  const chon: Record<string, string[]> = {};
  for (const c of chieu) {
    const raw = lay(c.khoa);
    chon[c.khoa] = raw ? raw.split("~").map((s) => s.trim()).filter(Boolean) : [];
  }
  return {
    tu: tu && NGAY.test(tu) ? tu : undefined,
    den: den && NGAY.test(den) ? den : undefined,
    chon,
  };
}

/**
 * WHERE chỉ theo CHIỀU (trạm, nhóm…), KHÔNG kèm ngày.
 *
 * Tách riêng vì KPI so kỳ phải tự dịch cửa sổ ngày (tháng trước, năm trước) —
 * không thể dính tu/den cố định vào. Chart theo thời gian cũng dùng cái này để
 * hiện toàn lịch sử, chỉ lọc theo chiều.
 *
 * where luôn bắt đầu bằng " AND …" (hoặc rỗng) để ghép sau một điều kiện có sẵn.
 * Tên cột do dashboard khai báo trong `chieu`, KHÔNG lấy từ URL → không có đường
 * injection qua tên cột; giá trị luôn đi qua tham số.
 */
export function whereChieu(
  loc: Loc,
  chieu: ChieuLoc[]
): { where: string; params: Record<string, unknown> } {
  const dieu: string[] = [];
  const params: Record<string, unknown> = {};
  for (const c of chieu) {
    const vals = loc.chon[c.khoa] ?? [];
    if (!vals.length) continue;
    const p = `loc_${c.khoa}`;
    dieu.push(`${c.cot} IN UNNEST(@${p})`);
    params[p] = vals;
  }
  return { where: dieu.length ? " AND " + dieu.join(" AND ") : "", params };
}

/** WHERE đầy đủ: chiều + khoảng ngày. Cho chart chỉ hiện trong kỳ đã chọn. */
export function whereBigQuery(
  loc: Loc,
  cotNgay: string,
  chieu: ChieuLoc[]
): { where: string; params: Record<string, unknown> } {
  const { where, params } = whereChieu(loc, chieu);
  const dieu: string[] = [];
  if (loc.tu) {
    dieu.push(`${cotNgay} >= @loc_tu`);
    params.loc_tu = loc.tu;
  }
  if (loc.den) {
    dieu.push(`${cotNgay} <= @loc_den`);
    params.loc_den = loc.den;
  }
  return {
    where: (dieu.length ? " AND " + dieu.join(" AND ") : "") + where,
    params,
  };
}

/** Có bộ lọc nào đang bật không — để hiện nút "Xoá lọc". */
export function coLoc(loc: Loc): boolean {
  return !!(loc.tu || loc.den || Object.values(loc.chon).some((v) => v.length));
}

/** Tóm tắt bộ lọc thành câu, cho phần đầu trang/diễn giải. */
export function tomTatLoc(loc: Loc, nhan: Record<string, string>): string {
  const phan: string[] = [];
  if (loc.tu || loc.den) {
    phan.push(`${loc.tu ? doiNgay(loc.tu) : "đầu"} → ${loc.den ? doiNgay(loc.den) : "nay"}`);
  }
  for (const [k, vals] of Object.entries(loc.chon)) {
    if (vals.length) phan.push(`${nhan[k] ?? k}: ${vals.join(", ")}`);
  }
  return phan.join(" · ") || "Toàn bộ";
}

function doiNgay(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
