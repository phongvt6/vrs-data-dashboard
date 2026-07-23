import "server-only";
import { pool, query } from "./db";
import type { Catalog, Column, Dataset, Relationship } from "./types";

export type { Catalog, Column, Dataset, Relationship } from "./types";

type DatasetRow = Omit<Dataset, "so_dong" | "columns"> & { so_dong: string | number };

function toDataset(row: DatasetRow, columns: Column[]): Dataset {
  return {
    id: row.id,
    ten: row.ten,
    nguon: row.nguon,
    duong_dan: row.duong_dan,
    chu_so_huu: row.chu_so_huu,
    tan_suat: row.tan_suat,
    phan_loai_bao_mat: row.phan_loai_bao_mat,
    trang_thai: row.trang_thai,
    so_dong: Number(row.so_dong) || 0,
    mo_ta: row.mo_ta,
    cap_nhat_lan_cuoi: row.cap_nhat_lan_cuoi || undefined,
    columns,
  };
}

export async function getCatalog(): Promise<Catalog> {
  const [dsRows, colRows, relRows] = await Promise.all([
    query<DatasetRow>(`SELECT * FROM catalog.datasets ORDER BY sort_order, ten`),
    query<Column & { dataset_id: string }>(
      `SELECT dataset_id, ten, kieu, khoa, mo_ta FROM catalog.columns ORDER BY dataset_id, pos`
    ),
    query<Relationship>(
      `SELECT id, from_id AS "from", to_id AS "to", loai, mo_ta FROM catalog.relationships ORDER BY id`
    ),
  ]);

  const colsByDs = new Map<string, Column[]>();
  for (const c of colRows) {
    const list = colsByDs.get(c.dataset_id) ?? [];
    list.push({ ten: c.ten, kieu: c.kieu, khoa: c.khoa, mo_ta: c.mo_ta });
    colsByDs.set(c.dataset_id, list);
  }

  return {
    datasets: dsRows.map((d) => toDataset(d, colsByDs.get(d.id) ?? [])),
    relationships: relRows,
  };
}

export async function getDataset(id: string): Promise<Dataset | undefined> {
  const rows = await query<DatasetRow>(`SELECT * FROM catalog.datasets WHERE id = $1`, [id]);
  if (!rows.length) return undefined;
  const cols = await query<Column>(
    `SELECT ten, kieu, khoa, mo_ta FROM catalog.columns WHERE dataset_id = $1 ORDER BY pos`,
    [id]
  );
  return toDataset(rows[0], cols);
}

// ---- Mutations (dùng bởi admin) ----

export type DatasetInput = Omit<Dataset, "cap_nhat_lan_cuoi"> & { cap_nhat_lan_cuoi?: string };

export async function saveDataset(d: DatasetInput): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO catalog.datasets
         (id, ten, nguon, duong_dan, chu_so_huu, tan_suat, phan_loai_bao_mat,
          trang_thai, so_dong, mo_ta, cap_nhat_lan_cuoi, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
       ON CONFLICT (id) DO UPDATE SET
         ten=$2, nguon=$3, duong_dan=$4, chu_so_huu=$5, tan_suat=$6,
         phan_loai_bao_mat=$7, trang_thai=$8, so_dong=$9, mo_ta=$10,
         cap_nhat_lan_cuoi=$11, updated_at=now()`,
      [
        d.id, d.ten, d.nguon, d.duong_dan, d.chu_so_huu, d.tan_suat,
        d.phan_loai_bao_mat, d.trang_thai, d.so_dong, d.mo_ta, d.cap_nhat_lan_cuoi ?? "",
      ]
    );
    await client.query(`DELETE FROM catalog.columns WHERE dataset_id = $1`, [d.id]);
    for (let i = 0; i < d.columns.length; i++) {
      const c = d.columns[i];
      await client.query(
        `INSERT INTO catalog.columns (dataset_id, pos, ten, kieu, khoa, mo_ta)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [d.id, i, c.ten, c.kieu, c.khoa, c.mo_ta]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function deleteDataset(id: string): Promise<void> {
  await query(`DELETE FROM catalog.datasets WHERE id = $1`, [id]);
}

export async function datasetExists(id: string): Promise<boolean> {
  const rows = await query(`SELECT 1 FROM catalog.datasets WHERE id = $1`, [id]);
  return rows.length > 0;
}

export async function saveRelationship(r: Relationship): Promise<void> {
  await query(
    `INSERT INTO catalog.relationships (id, from_id, to_id, loai, mo_ta)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (id) DO UPDATE SET from_id=$2, to_id=$3, loai=$4, mo_ta=$5`,
    [r.id, r.from, r.to, r.loai, r.mo_ta]
  );
}

export async function deleteRelationship(id: string): Promise<void> {
  await query(`DELETE FROM catalog.relationships WHERE id = $1`, [id]);
}

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await query<{ key: string; value: string }>(
    `SELECT key, value FROM catalog.settings`
  );
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function setSetting(key: string, value: string): Promise<void> {
  await query(
    `INSERT INTO catalog.settings (key, value) VALUES ($1,$2)
     ON CONFLICT (key) DO UPDATE SET value=$2`,
    [key, value]
  );
}
