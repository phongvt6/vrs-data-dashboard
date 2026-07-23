// Collector Google Sheets — đọc hàng header (dòng 1) của từng tab làm "cột".
// Sheets không có kiểu dữ liệu như DB nên `kieu` để trống.
//
// Config (scripts/sources.json):
//   { "id":"kpi_sheet", "type":"sheets", "spreadsheetId":"env:SHEETS_ID_KPI",
//     "tabs":["TONG_HOP","P&L Data"], "nguon":"Google Sheets" }
//   (bỏ "tabs" -> tự lấy tất cả tab trong spreadsheet)
//
// Cần: npm i -D google-auth-library
// GOOGLE_APPLICATION_CREDENTIALS = service account có quyền đọc Sheets API,
//   và share spreadsheet cho email service account đó.

import { resolveEnv } from "../lib/io.mjs";

async function accessToken() {
  let GoogleAuth;
  try {
    ({ GoogleAuth } = await import("google-auth-library"));
  } catch {
    throw new Error(`cần cài driver: npm i -D google-auth-library`);
  }
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  return token;
}

async function api(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Sheets API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function collect(source) {
  const sheetId = resolveEnv(source.spreadsheetId);
  if (!sheetId) {
    console.warn(`  · [${source.id}] bỏ qua: thiếu spreadsheetId`);
    return [];
  }
  const token = await accessToken();

  // Danh sách tab: theo config hoặc lấy hết từ metadata.
  let tabs = source.tabs;
  if (!tabs || !tabs.length) {
    const meta = await api(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`,
      token
    );
    tabs = (meta.sheets ?? []).map((s) => s.properties.title);
  }

  const out = [];
  for (const tab of tabs) {
    const range = encodeURIComponent(`${tab}!1:1`);
    const data = await api(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
      token
    );
    const header = (data.values && data.values[0]) || [];
    out.push({
      nguon_ref: { type: "sheets", source: source.id, path: `${sheetId}#${tab}` },
      ten: tab,
      nguon: source.nguon ?? "Google Sheets",
      duong_dan: `Sheet: ${tab}`,
      // so_dong bỏ trống -> merge giữ giá trị người đã điền
      columns: header
        .filter((h) => String(h).trim() !== "")
        .map((h) => ({ ten: String(h), kieu: "" })),
    });
  }
  return out;
}
