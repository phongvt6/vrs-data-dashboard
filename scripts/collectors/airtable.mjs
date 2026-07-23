// Collector Airtable — kéo schema qua Meta API (không cần thư viện, dùng fetch).
//
// Config (scripts/sources.json):
//   { "id":"airtable_ops", "type":"airtable", "baseEnv":"AIRTABLE_BASE",
//     "tokenEnv":"AIRTABLE_TOKEN", "nguon":"Airtable" }
//
// AIRTABLE_TOKEN = Personal Access Token có quyền schema.bases:read
// AIRTABLE_BASE  = base id (appXXXXXXXX)

import { resolveEnv } from "../lib/io.mjs";

export async function collect(source) {
  const token = resolveEnv(source.tokenEnv ?? "env:AIRTABLE_TOKEN");
  const base = resolveEnv(source.baseEnv ?? "env:AIRTABLE_BASE");
  if (!token || !base) {
    console.warn(`  · [${source.id}] bỏ qua: thiếu token/base`);
    return [];
  }

  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${base}/tables`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`[${source.id}] Airtable Meta API lỗi ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();

  return (json.tables ?? []).map((t) => ({
    nguon_ref: { type: "airtable", source: source.id, path: t.id },
    ten: t.name,
    nguon: source.nguon ?? "Airtable",
    duong_dan: `Airtable ${base} / ${t.name}`,
    mo_ta: t.description ?? "",
    columns: (t.fields ?? []).map((f) => ({ ten: f.name, kieu: f.type })),
  }));
}
