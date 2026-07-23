// Collector Postgres — dùng cho Supabase (Supabase = Postgres bên dưới) và
// mọi Postgres khác. Kéo schema qua information_schema.COLUMNS (chuẩn SQL).
//
// Config (scripts/sources.json):
//   { "id":"supabase", "type":"postgres", "connEnv":"SUPABASE_DB_URL",
//     "schemas":["public"], "nguon":"Supabase" }
//
// Cần: npm i -D pg   (chỉ khi thực sự chạy nguồn này)
// SUPABASE_DB_URL = connection string Postgres của Supabase
//   (Project Settings → Database → Connection string → URI).

import { resolveEnv } from "../lib/io.mjs";

export async function collect(source) {
  const conn = resolveEnv(source.connEnv ?? "env:SUPABASE_DB_URL") ?? resolveEnv(source.conn);
  if (!conn) {
    console.warn(`  · [${source.id}] bỏ qua: chưa set connection string`);
    return [];
  }

  let pg;
  try {
    pg = await import("pg");
  } catch {
    throw new Error(`[${source.id}] cần cài driver: npm i -D pg`);
  }

  const schemas = source.schemas ?? ["public"];
  const client = new pg.default.Client({ connectionString: conn });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT table_schema, table_name, column_name, data_type
         FROM information_schema.columns
        WHERE table_schema = ANY($1)
        ORDER BY table_schema, table_name, ordinal_position`,
      [schemas]
    );

    // Ước lượng số dòng từ pg_class.reltuples (nhanh, không quét bảng).
    const est = new Map();
    const { rows: statRows } = await client.query(
      `SELECT n.nspname AS schema, c.relname AS name, c.reltuples::bigint AS rows
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = ANY($1) AND c.relkind IN ('r','p','v','m')`,
      [schemas]
    );
    for (const r of statRows) est.set(`${r.schema}.${r.name}`, Number(r.rows));

    const byTable = new Map();
    for (const r of rows) {
      const path = `${r.table_schema}.${r.table_name}`;
      if (!byTable.has(path)) byTable.set(path, []);
      byTable.get(path).push({ ten: r.column_name, kieu: r.data_type });
    }

    return [...byTable].map(([path, columns]) => ({
      nguon_ref: { type: "postgres", source: source.id, path },
      ten: path.split(".").pop(),
      nguon: source.nguon ?? "Supabase",
      duong_dan: `${source.id}: ${path}`,
      so_dong: est.get(path) ?? 0,
      columns,
    }));
  } finally {
    await client.end();
  }
}
