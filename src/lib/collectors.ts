import "server-only";
import type { SourceFull } from "./sources";

export type CollectedColumn = { ten: string; kieu: string };
export type CollectedTable = {
  nguon_ref: { type: string; source: string; path: string };
  ten: string;
  nguon: string;
  duong_dan: string;
  so_dong?: number;
  columns: CollectedColumn[];
};

function cfg(source: SourceFull, key: string): string {
  const v = source.config?.[key];
  return v == null ? "" : String(v);
}

export async function collect(source: SourceFull): Promise<CollectedTable[]> {
  switch (source.type) {
    case "postgres":
      return collectPostgres(source);
    case "airtable":
      return collectAirtable(source);
    case "bigquery":
      return collectBigQuery(source);
    case "sheets":
      return collectSheets(source);
    default:
      throw new Error(`Loại nguồn chưa hỗ trợ: ${source.type}`);
  }
}

// ---- Postgres / Supabase ----
async function collectPostgres(source: SourceFull): Promise<CollectedTable[]> {
  const conn = source.secret;
  if (!conn) throw new Error("Thiếu connection string.");
  const schemas =
    Array.isArray(source.config?.schemas) && source.config.schemas.length
      ? (source.config.schemas as string[])
      : ["public"];

  const { Client } = await import("pg");
  const isLocal = /localhost|127\.0\.0\.1/.test(conn);
  const client = new Client({ connectionString: conn, ssl: isLocal ? false : { rejectUnauthorized: false } });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT table_schema, table_name, column_name, data_type
         FROM information_schema.columns
        WHERE table_schema = ANY($1)
        ORDER BY table_schema, table_name, ordinal_position`,
      [schemas]
    );
    const est = new Map<string, number>();
    const stat = await client.query(
      `SELECT n.nspname AS schema, c.relname AS name, c.reltuples::bigint AS rows
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = ANY($1) AND c.relkind IN ('r','p','v','m')`,
      [schemas]
    );
    for (const r of stat.rows) est.set(`${r.schema}.${r.name}`, Number(r.rows));

    const byTable = new Map<string, CollectedColumn[]>();
    for (const r of rows) {
      const path = `${r.table_schema}.${r.table_name}`;
      if (!byTable.has(path)) byTable.set(path, []);
      byTable.get(path)!.push({ ten: r.column_name, kieu: r.data_type });
    }
    return [...byTable].map(([path, columns]) => ({
      nguon_ref: { type: "postgres", source: source.id, path },
      ten: path.split(".").pop()!,
      nguon: source.nguon || "Supabase",
      duong_dan: `${source.label}: ${path}`,
      so_dong: est.get(path) ?? 0,
      columns,
    }));
  } finally {
    await client.end();
  }
}

// ---- Airtable ----
async function collectAirtable(source: SourceFull): Promise<CollectedTable[]> {
  const token = source.secret;
  const base = cfg(source, "baseId");
  if (!token || !base) throw new Error("Thiếu token hoặc baseId.");
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${base}/tables`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Airtable API ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { tables?: Array<{ id: string; name: string; fields?: Array<{ name: string; type: string }> }> };
  return (json.tables ?? []).map((t) => ({
    nguon_ref: { type: "airtable", source: source.id, path: t.id },
    ten: t.name,
    nguon: source.nguon || "Airtable",
    duong_dan: `Airtable ${base} / ${t.name}`,
    columns: (t.fields ?? []).map((f) => ({ ten: f.name, kieu: f.type })),
  }));
}

// ---- BigQuery ----
async function collectBigQuery(source: SourceFull): Promise<CollectedTable[]> {
  const project = cfg(source, "project");
  const dataset = cfg(source, "dataset");
  if (!project || !dataset) throw new Error("Thiếu project hoặc dataset.");
  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(source.secret);
  } catch {
    throw new Error("Service-account JSON không hợp lệ.");
  }
  const { BigQuery } = await import("@google-cloud/bigquery");
  const bq = new BigQuery({ projectId: project, credentials });
  const [rows] = await bq.query({
    query: `SELECT table_name, column_name, data_type
            FROM \`${project}.${dataset}.INFORMATION_SCHEMA.COLUMNS\`
            ORDER BY table_name, ordinal_position`,
  });
  const est = new Map<string, number>();
  try {
    const [t] = await bq.query({ query: `SELECT table_id, row_count FROM \`${project}.${dataset}.__TABLES__\`` });
    for (const r of t as Array<{ table_id: string; row_count: number }>) est.set(r.table_id, Number(r.row_count));
  } catch {
    /* view -> bỏ qua */
  }
  const byTable = new Map<string, CollectedColumn[]>();
  for (const r of rows as Array<{ table_name: string; column_name: string; data_type: string }>) {
    if (!byTable.has(r.table_name)) byTable.set(r.table_name, []);
    byTable.get(r.table_name)!.push({ ten: r.column_name, kieu: r.data_type });
  }
  return [...byTable].map(([table, columns]) => ({
    nguon_ref: { type: "bigquery", source: source.id, path: table },
    ten: table,
    nguon: source.nguon || "BigQuery",
    duong_dan: `${project}.${dataset}.${table}`,
    so_dong: est.get(table) ?? 0,
    columns,
  }));
}

// ---- Google Sheets ----
async function collectSheets(source: SourceFull): Promise<CollectedTable[]> {
  const sheetId = cfg(source, "spreadsheetId");
  if (!sheetId) throw new Error("Thiếu spreadsheetId.");
  let creds: { client_email: string; private_key: string };
  try {
    creds = JSON.parse(source.secret);
  } catch {
    throw new Error("Service-account JSON không hợp lệ.");
  }
  const { JWT } = await import("google-auth-library");
  const auth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const { token } = await auth.getAccessToken();
  const api = async (url: string) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Sheets API ${res.status}: ${await res.text()}`);
    return res.json();
  };

  let tabs: string[] = Array.isArray(source.config?.tabs) ? (source.config.tabs as string[]) : [];
  if (!tabs.length) {
    const meta = await api(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`);
    tabs = ((meta.sheets ?? []) as Array<{ properties: { title: string } }>).map((s) => s.properties.title);
  }
  const out: CollectedTable[] = [];
  for (const tab of tabs) {
    const range = encodeURIComponent(`${tab}!1:1`);
    const data = await api(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`);
    const header: string[] = (data.values && data.values[0]) || [];
    out.push({
      nguon_ref: { type: "sheets", source: source.id, path: `${sheetId}#${tab}` },
      ten: tab,
      nguon: source.nguon || "Google Sheets",
      duong_dan: `Sheet: ${tab}`,
      columns: header.filter((h) => String(h).trim() !== "").map((h) => ({ ten: String(h), kieu: "" })),
    });
  }
  return out;
}
