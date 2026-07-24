// Đọc CSV do Google Sheets xuất qua "Publish to web".
//
// Vì sao cần: sheet publish đọc được bằng một URL công khai, KHÔNG cần service
// account. Đây là cách các tool tự làm trong công ty (vd worker thưởng khoán)
// đang lấy số, nên muốn đưa dữ liệu của họ vào danh mục thì app phải đọc được
// đúng đường đó.
//
// Bản sao cho script chạy ngoài Next nằm ở scripts/lib/csv.mjs — hai file phải
// hành xử giống nhau (giống cặp src/lib/sync.ts ↔ scripts/lib/merge.mjs).

/** Tách CSV thành mảng dòng × ô. Chịu được ô có dấu phẩy, xuống dòng, "" thoát. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = false;
      } else cur += c;
    } else if (c === '"') inQuote = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (c !== "\r") cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

/** URL CSV của một tab trong sheet đã publish. */
export function pubCsvUrl(pubId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?gid=${gid}&single=true&output=csv`;
}

/** Tải một tab. Ném lỗi nói rõ nguyên nhân thường gặp nhất: chưa publish. */
export async function docTabPub(pubId: string, gid: string): Promise<string[][]> {
  const res = await fetch(pubCsvUrl(pubId, gid), {
    headers: { "user-agent": "Mozilla/5.0" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `Không đọc được tab gid=${gid} (HTTP ${res.status}). Kiểm tra File → Share → Publish to web đã bật cho tab này chưa.`
    );
  }
  const txt = await res.text();
  if (txt.trim().startsWith("<")) {
    throw new Error(`Tab gid=${gid} trả về HTML thay vì CSV — nhiều khả năng chưa được publish.`);
  }
  return parseCsv(txt);
}

/** Khai báo tab trong config của nguồn sheets_pub. */
export type TabPub = { gid: string; title: string };

export function tabsPub(config: Record<string, unknown> | undefined): TabPub[] {
  const raw = config?.tabs;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => {
      const o = t as { gid?: unknown; title?: unknown };
      return { gid: String(o?.gid ?? "").trim(), title: String(o?.title ?? "").trim() };
    })
    .filter((t) => t.gid !== "" && t.title !== "");
}
