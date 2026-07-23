import "server-only";
import { pool, query } from "./db";
import { getSourceFull, setSyncStatus } from "./sources";
import { collect, type CollectedTable } from "./collectors";
import type { Column } from "./types";

type NguonRef = { type: string; source: string; path: string } | null;

type DbDataset = {
  id: string;
  ten: string;
  nguon: string;
  duong_dan: string;
  chu_so_huu: string;
  tan_suat: string;
  phan_loai_bao_mat: string;
  trang_thai: string;
  so_dong: number;
  mo_ta: string;
  cap_nhat_lan_cuoi: string;
  nguon_ref: NguonRef;
  columns: Column[];
};

export type SyncReport = {
  source: string;
  tables: number;
  added: string[];
  updated: string[];
  columnsAdded: { id: string; cols: string[] }[];
  columnsRemoved: { id: string; cols: string[] }[];
  orphaned: string[];
};

function refKey(ref: NguonRef): string | null {
  if (!ref || !ref.type) return null;
  return [ref.type, ref.source ?? "", ref.path ?? ""].join(":");
}

function slugify(name: string, used: Set<string>): string {
  const base =
    String(name)
      .normalize("NFD")
      .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "dataset";
  let id = base;
  let n = 2;
  while (used.has(id)) id = `${base}_${n++}`;
  return id;
}

async function loadDbDatasets(): Promise<DbDataset[]> {
  const [ds, cols] = await Promise.all([
    query<DbDataset>(`SELECT * FROM catalog.datasets`),
    query<Column & { dataset_id: string }>(
      `SELECT dataset_id, ten, kieu, khoa, mo_ta FROM catalog.columns ORDER BY dataset_id, pos`
    ),
  ]);
  const byDs = new Map<string, Column[]>();
  for (const c of cols) {
    if (!byDs.has(c.dataset_id)) byDs.set(c.dataset_id, []);
    byDs.get(c.dataset_id)!.push({ ten: c.ten, kieu: c.kieu, khoa: c.khoa, mo_ta: c.mo_ta });
  }
  return ds.map((d) => ({ ...d, so_dong: Number(d.so_dong) || 0, columns: byDs.get(d.id) ?? [] }));
}

function mergeColumns(oldCols: Column[], newCols: { ten: string; kieu: string }[]) {
  const oldByName = new Map(oldCols.map((c) => [c.ten, c]));
  const newNames = new Set(newCols.map((c) => c.ten));
  const columns: Column[] = newCols.map((c) => {
    const prev = oldByName.get(c.ten);
    return { ten: c.ten, kieu: c.kieu, khoa: prev?.khoa ?? "", mo_ta: prev?.mo_ta ?? "" };
  });
  const added = newCols.filter((c) => !oldByName.has(c.ten)).map((c) => c.ten);
  const removed = oldCols.filter((c) => !newNames.has(c.ten)).map((c) => c.ten);
  return { columns, added, removed };
}

async function upsertDataset(d: DbDataset): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO catalog.datasets
         (id, ten, nguon, duong_dan, chu_so_huu, tan_suat, phan_loai_bao_mat,
          trang_thai, so_dong, mo_ta, cap_nhat_lan_cuoi, nguon_ref, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
       ON CONFLICT (id) DO UPDATE SET
         ten=$2, nguon=$3, duong_dan=$4, chu_so_huu=$5, tan_suat=$6, phan_loai_bao_mat=$7,
         trang_thai=$8, so_dong=$9, mo_ta=$10, cap_nhat_lan_cuoi=$11, nguon_ref=$12, updated_at=now()`,
      [
        d.id, d.ten, d.nguon, d.duong_dan, d.chu_so_huu, d.tan_suat, d.phan_loai_bao_mat,
        d.trang_thai, d.so_dong, d.mo_ta, d.cap_nhat_lan_cuoi,
        d.nguon_ref ? JSON.stringify(d.nguon_ref) : null,
      ]
    );
    await client.query(`DELETE FROM catalog.columns WHERE dataset_id = $1`, [d.id]);
    for (let i = 0; i < d.columns.length; i++) {
      const c = d.columns[i];
      await client.query(
        `INSERT INTO catalog.columns (dataset_id, pos, ten, kieu, khoa, mo_ta) VALUES ($1,$2,$3,$4,$5,$6)`,
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

function isoNow(): string {
  return new Date().toISOString().slice(0, 16);
}

// Đồng bộ 1 nguồn: kéo bảng → merge giữ metadata → ghi DB. Trả báo cáo.
export async function syncSource(sourceId: string): Promise<SyncReport> {
  const source = await getSourceFull(sourceId);
  if (!source) throw new Error("Không tìm thấy nguồn.");

  const collected: CollectedTable[] = await collect(source);
  const before = await loadDbDatasets();
  const now = isoNow();

  const byRef = new Map<string, DbDataset>();
  for (const d of before) {
    const k = refKey(d.nguon_ref);
    if (k) byRef.set(k, d);
  }
  const usedIds = new Set(before.map((d) => d.id));

  const report: SyncReport = {
    source: source.label,
    tables: collected.length,
    added: [],
    updated: [],
    columnsAdded: [],
    columnsRemoved: [],
    orphaned: [],
  };
  const seen = new Set<string>();
  const toWrite: DbDataset[] = [];

  for (const t of collected) {
    const k = refKey(t.nguon_ref);
    if (!k) continue;
    seen.add(k);
    const existing = byRef.get(k);
    if (existing) {
      const { columns, added, removed } = mergeColumns(existing.columns, t.columns);
      const merged: DbDataset = {
        ...existing,
        columns,
        so_dong: t.so_dong ?? existing.so_dong,
        cap_nhat_lan_cuoi: now,
      };
      toWrite.push(merged);
      report.updated.push(existing.id);
      if (added.length) report.columnsAdded.push({ id: existing.id, cols: added });
      if (removed.length) report.columnsRemoved.push({ id: existing.id, cols: removed });
    } else {
      const id = slugify(t.ten, usedIds);
      usedIds.add(id);
      toWrite.push({
        id,
        ten: t.ten,
        nguon: t.nguon,
        duong_dan: t.duong_dan ?? "",
        chu_so_huu: "",
        tan_suat: "",
        phan_loai_bao_mat: "Nội bộ",
        trang_thai: "prototype",
        so_dong: t.so_dong ?? 0,
        mo_ta: "",
        cap_nhat_lan_cuoi: now,
        nguon_ref: t.nguon_ref,
        columns: t.columns.map((c) => ({ ten: c.ten, kieu: c.kieu, khoa: "", mo_ta: "" })),
      });
      report.added.push(id);
    }
  }

  // Dataset của nguồn này nhưng nguồn không còn trả về -> cảnh báo (không xóa).
  for (const [k, d] of byRef) {
    if (d.nguon_ref?.source === source.id && !seen.has(k)) report.orphaned.push(d.id);
  }

  for (const d of toWrite) await upsertDataset(d);

  const note =
    `${report.tables} bảng · +${report.added.length} mới · ~${report.updated.length} cập nhật` +
    (report.orphaned.length ? ` · ⚠${report.orphaned.length} mất nguồn` : "");
  await setSyncStatus(source.id, now, note);

  return report;
}
