// Bản cho script chạy ngoài Next của src/lib/csv.ts — xem chú thích ở file đó.
// Sửa một bên thì sửa cả hai.

export function parseCsv(text) {
  const rows = [];
  let row = [], cur = "", inQuote = false;
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

export function pubCsvUrl(pubId, gid) {
  return `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?gid=${gid}&single=true&output=csv`;
}

export async function docTabPub(pubId, gid) {
  const res = await fetch(pubCsvUrl(pubId, gid), { headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) {
    throw new Error(`không đọc được tab gid=${gid} (HTTP ${res.status}) — kiểm tra File → Share → Publish to web`);
  }
  const txt = await res.text();
  if (txt.trim().startsWith("<")) throw new Error(`tab gid=${gid} trả HTML thay vì CSV — nhiều khả năng chưa publish`);
  return parseCsv(txt);
}

export function tabsPub(config) {
  const raw = config?.tabs;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => ({ gid: String(t?.gid ?? "").trim(), title: String(t?.title ?? "").trim() }))
    .filter((t) => t.gid !== "" && t.title !== "");
}
