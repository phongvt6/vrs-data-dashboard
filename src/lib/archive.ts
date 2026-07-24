import "server-only";
import { pool, query } from "./db";

// Xoá là chụp lại rồi mới xoá. Không có đường nào trong app xoá thẳng dataset
// hay dashboard mà không đi qua đây.

export type ArchiveLoai = "dataset" | "dashboard";

export type ArchiveItem = {
  id: number;
  loai: ArchiveLoai;
  doi_tuong_id: string;
  ten: string;
  xoa_luc: string;
  ghi_chu: string;
  /** Số bản ghi phụ thuộc đã chụp cùng — hiện trong danh sách cho dễ hình dung. */
  tom_tat: string;
};

type Row = Record<string, unknown>;
type Snapshot = Record<string, Row[]>;

/** Chụp mọi thứ phụ thuộc vào một dataset. */
async function snapshotDataset(id: string): Promise<Snapshot | null> {
  const datasets = await query<Row>(`SELECT * FROM catalog.datasets WHERE id = $1`, [id]);
  if (!datasets.length) return null;
  const [columns, relationships, dashboard_datasets] = await Promise.all([
    query<Row>(`SELECT * FROM catalog.columns WHERE dataset_id = $1 ORDER BY pos`, [id]),
    query<Row>(`SELECT * FROM catalog.relationships WHERE from_id = $1 OR to_id = $1`, [id]),
    query<Row>(`SELECT * FROM catalog.dashboard_datasets WHERE dataset_id = $1`, [id]),
  ]);
  return { datasets, columns, relationships, dashboard_datasets };
}

/** Chụp mọi thứ phụ thuộc vào một dashboard. */
async function snapshotDashboard(id: string): Promise<Snapshot | null> {
  const dashboards = await query<Row>(`SELECT * FROM catalog.dashboards WHERE id = $1`, [id]);
  if (!dashboards.length) return null;
  const dashboard_datasets = await query<Row>(
    `SELECT * FROM catalog.dashboard_datasets WHERE dashboard_id = $1`,
    [id]
  );
  return { dashboards, dashboard_datasets };
}

function tomTat(loai: ArchiveLoai, s: Snapshot): string {
  const n = (k: string) => s[k]?.length ?? 0;
  return loai === "dataset"
    ? `${n("columns")} cột · ${n("relationships")} liên kết · ${n("dashboard_datasets")} dashboard đang dùng`
    : `${n("dashboard_datasets")} dataset nguồn`;
}

/**
 * Chụp rồi xoá. Trả về id bản lưu trữ, hoặc undefined nếu đối tượng không tồn tại.
 * Cả hai bước nằm trong một transaction — không có chuyện xoá xong mà mất bản chụp.
 */
export async function archiveAndDelete(loai: ArchiveLoai, id: string): Promise<number | undefined> {
  const snap = loai === "dataset" ? await snapshotDataset(id) : await snapshotDashboard(id);
  if (!snap) return undefined;

  const goc = loai === "dataset" ? snap.datasets[0] : snap.dashboards[0];
  const bang = loai === "dataset" ? "datasets" : "dashboards";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await client.query(
      `INSERT INTO catalog.archive (loai, doi_tuong_id, ten, du_lieu, ghi_chu)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [loai, id, String(goc.ten ?? id), JSON.stringify(snap), tomTat(loai, snap)]
    );
    await client.query(`DELETE FROM catalog.${bang} WHERE id = $1`, [id]);
    await client.query("COMMIT");
    return Number(res.rows[0].id);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function getArchive(): Promise<ArchiveItem[]> {
  const rows = await query<{
    id: string; loai: ArchiveLoai; doi_tuong_id: string; ten: string;
    xoa_luc: Date | string; ghi_chu: string;
  }>(
    `SELECT id, loai, doi_tuong_id, ten, xoa_luc, ghi_chu
       FROM catalog.archive ORDER BY xoa_luc DESC`
  );
  return rows.map((r) => ({
    id: Number(r.id),
    loai: r.loai,
    doi_tuong_id: r.doi_tuong_id,
    ten: r.ten,
    xoa_luc: new Date(r.xoa_luc).toISOString().slice(0, 16).replace("T", " "),
    ghi_chu: r.ghi_chu,
    tom_tat: r.ghi_chu,
  }));
}

/** Chèn lại các dòng đã chụp. Cột nào cũng ghi lại đúng như lúc xoá. */
async function chenLai(client: { query: (q: string, p?: unknown[]) => Promise<unknown> }, bang: string, rows: Row[]) {
  for (const r of rows) {
    const cols = Object.keys(r);
    if (!cols.length) continue;
    const holes = cols.map((_, i) => `$${i + 1}`).join(",");
    const vals = cols.map((c) => {
      const v = r[c];
      // jsonb quay về từ pg là object — phải stringify lại khi ghi vào.
      return v !== null && typeof v === "object" && !(v instanceof Date) ? JSON.stringify(v) : v;
    });
    await client.query(
      `INSERT INTO catalog.${bang} (${cols.map((c) => `"${c}"`).join(",")})
       VALUES (${holes}) ON CONFLICT DO NOTHING`,
      vals
    );
  }
}

export type RestoreResult = { ok: boolean; error?: string };

/**
 * Phục hồi một bản lưu trữ. Thứ tự chèn quan trọng: bảng cha trước, bảng con sau.
 * Dòng nào tham chiếu tới thứ đã bị xoá khỏi hệ thống thì bỏ qua (ON CONFLICT /
 * FK) — phục hồi được phần nào hay phần đó, và báo lại.
 */
export async function restoreArchive(archiveId: number): Promise<RestoreResult> {
  const rows = await query<{ loai: ArchiveLoai; doi_tuong_id: string; du_lieu: Snapshot }>(
    `SELECT loai, doi_tuong_id, du_lieu FROM catalog.archive WHERE id = $1`,
    [archiveId]
  );
  if (!rows.length) return { ok: false, error: "Không tìm thấy bản lưu trữ." };
  const { loai, doi_tuong_id, du_lieu } = rows[0];

  const dangCo = await query(
    `SELECT 1 FROM catalog.${loai === "dataset" ? "datasets" : "dashboards"} WHERE id = $1`,
    [doi_tuong_id]
  );
  if (dangCo.length) return { ok: false, error: `"${doi_tuong_id}" hiện đã tồn tại — xoá hoặc đổi tên cái đang có trước.` };

  // Bảng cha trước, con sau. dashboard_datasets phải đi sau cả hai đầu.
  // Bản lưu trữ cũ có thể còn khoá charts/chart_queries — chenLai bỏ qua bảng
  // không tồn tại, nên phục hồi bản cũ vẫn chạy, chỉ là 2 khoá đó rơi rụng.
  const thuTu =
    loai === "dataset"
      ? ["datasets", "columns", "relationships", "dashboard_datasets"]
      : ["dashboards", "dashboard_datasets"];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const bang of thuTu) await chenLai(client, bang, du_lieu[bang] ?? []);
    await client.query(`DELETE FROM catalog.archive WHERE id = $1`, [archiveId]);
    await client.query("COMMIT");
    return { ok: true };
  } catch (e) {
    await client.query("ROLLBACK");
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    client.release();
  }
}

/** Xoá vĩnh viễn một bản lưu trữ — sau bước này thì thật sự không lấy lại được. */
export async function purgeArchive(archiveId: number): Promise<void> {
  await query(`DELETE FROM catalog.archive WHERE id = $1`, [archiveId]);
}
