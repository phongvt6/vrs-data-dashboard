// Collector BigQuery — kéo schema qua INFORMATION_SCHEMA.COLUMNS.
//
// Config (scripts/sources.json):
//   { "id":"bq_main", "type":"bigquery", "project":"env:BQ_PROJECT",
//     "dataset":"env:BQ_DATASET", "nguon":"BigQuery" }
//
// Cần: npm i -D @google-cloud/bigquery
// GOOGLE_APPLICATION_CREDENTIALS trỏ tới service account JSON.

import { resolveEnv } from "../lib/io.mjs";

export async function collect(source) {
  const project = resolveEnv(source.project);
  const dataset = resolveEnv(source.dataset);
  if (!project || !dataset) {
    console.warn(`  · [${source.id}] bỏ qua: thiếu project/dataset`);
    return [];
  }

  let BigQuery;
  try {
    ({ BigQuery } = await import("@google-cloud/bigquery"));
  } catch {
    throw new Error(`[${source.id}] cần cài driver: npm i -D @google-cloud/bigquery`);
  }

  const bq = new BigQuery({ projectId: project });
  const [rows] = await bq.query({
    query: `
      SELECT table_name, column_name, data_type
      FROM \`${project}.${dataset}.INFORMATION_SCHEMA.COLUMNS\`
      ORDER BY table_name, ordinal_position
    `,
  });

  // Số dòng từ __TABLES__ (metadata, không tính phí quét).
  const est = new Map();
  try {
    const [t] = await bq.query({
      query: `SELECT table_id, row_count FROM \`${project}.${dataset}.__TABLES__\``,
    });
    for (const r of t) est.set(r.table_id, Number(r.row_count));
  } catch {
    /* view không có __TABLES__ -> bỏ qua */
  }

  const byTable = new Map();
  for (const r of rows) {
    if (!byTable.has(r.table_name)) byTable.set(r.table_name, []);
    byTable.get(r.table_name).push({ ten: r.column_name, kieu: r.data_type });
  }

  return [...byTable].map(([table, columns]) => ({
    nguon_ref: { type: "bigquery", source: source.id, path: table },
    ten: table,
    nguon: source.nguon ?? "BigQuery",
    duong_dan: `${project}.${dataset}.${table}`,
    so_dong: est.get(table) ?? 0,
    columns,
  }));
}
