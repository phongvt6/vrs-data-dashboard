// Merge schema kéo từ nguồn sống vào catalog HIỆN CÓ.
//
// Nguyên tắc vàng: collector chỉ biết phần MÁY (tên bảng, tên cột, kiểu).
// Mọi thứ do NGƯỜI gõ phải được giữ nguyên:
//   - mức dataset: chu_so_huu, mo_ta, tan_suat, phan_loai_bao_mat, trang_thai, cap_nhat_lan_cuoi
//   - mức cột:     khoa (PK/FK), mo_ta
//   - toàn bộ relationships (merge KHÔNG bao giờ đụng tới)
//
// Ghép dataset sống <-> catalog qua `nguon_ref` (khóa máy ổn định), KHÔNG
// qua `duong_dan`/`ten` (người có thể sửa cho dễ đọc).

import { slugify } from "./io.mjs";

// Khóa định danh ổn định của một bảng nguồn: "type:source:path".
export function refKey(ref) {
  if (!ref || !ref.type) return null;
  return [ref.type, ref.source ?? "", ref.path ?? ""].join(":");
}

// collected: [{ nguon_ref, ten, nguon, duong_dan, so_dong?, columns:[{ten,kieu}] }]
// Trả về { catalog, report }.
export function mergeSchema(catalog, collected, opts = {}) {
  const now = opts.now ?? null; // ISO string; truyền vào để test tái lập được
  const next = {
    datasets: catalog.datasets.map((d) => ({ ...d })),
    relationships: catalog.relationships, // giữ nguyên tham chiếu — không đụng
  };

  const byRef = new Map();
  for (const d of next.datasets) {
    const k = refKey(d.nguon_ref);
    if (k) byRef.set(k, d);
  }
  const usedIds = new Set(next.datasets.map((d) => d.id));

  const report = {
    updated: [],
    added: [],
    columnsAdded: [],
    columnsRemoved: [],
    orphaned: [], // trong catalog có nguon_ref nhưng nguồn không còn bảng -> cảnh báo, KHÔNG xóa
  };

  const seenKeys = new Set();

  for (const t of collected) {
    const k = refKey(t.nguon_ref);
    if (!k) continue;
    seenKeys.add(k);
    const existing = byRef.get(k);

    if (existing) {
      const { columns, added, removed } = mergeColumns(existing.columns ?? [], t.columns);
      existing.columns = columns;
      if (t.so_dong != null) existing.so_dong = t.so_dong;
      if (now) existing.cap_nhat_lan_cuoi = now;
      report.updated.push(existing.id);
      if (added.length) report.columnsAdded.push({ id: existing.id, cols: added });
      if (removed.length) report.columnsRemoved.push({ id: existing.id, cols: removed });
    } else {
      // Bảng mới -> tạo stub để người điền metadata sau.
      const id = slugify(t.ten, usedIds);
      usedIds.add(id);
      const stub = {
        id,
        ten: t.ten,
        nguon: t.nguon,
        duong_dan: t.duong_dan ?? "",
        chu_so_huu: "",
        tan_suat: "",
        phan_loai_bao_mat: t.phan_loai_bao_mat ?? "Nội bộ",
        trang_thai: t.trang_thai ?? "prototype",
        so_dong: t.so_dong ?? 0,
        mo_ta: t.mo_ta ?? "",
        cap_nhat_lan_cuoi: now ?? "",
        nguon_ref: t.nguon_ref,
        columns: t.columns.map((c) => ({ ten: c.ten, kieu: c.kieu, khoa: "", mo_ta: "" })),
      };
      next.datasets.push(stub);
      report.added.push(id);
    }
  }

  // Dataset có nguon_ref nhưng nguồn không trả về nữa (bảng bị xóa / mất quyền).
  for (const [k, d] of byRef) {
    if (!seenKeys.has(k)) report.orphaned.push(d.id);
  }

  return { catalog: next, report };
}

// Cập nhật tên/kiểu cột từ nguồn; giữ khoa + mo_ta theo tên cột.
function mergeColumns(oldCols, newCols) {
  const oldByName = new Map(oldCols.map((c) => [c.ten, c]));
  const newNames = new Set(newCols.map((c) => c.ten));

  const columns = newCols.map((c) => {
    const prev = oldByName.get(c.ten);
    return {
      ten: c.ten,
      kieu: c.kieu,
      khoa: prev?.khoa ?? "",
      mo_ta: prev?.mo_ta ?? "",
    };
  });

  const added = newCols.filter((c) => !oldByName.has(c.ten)).map((c) => c.ten);
  const removed = oldCols.filter((c) => !newNames.has(c.ten)).map((c) => c.ten);
  return { columns, added, removed };
}
