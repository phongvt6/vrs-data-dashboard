import "server-only";
import { pool, query } from "./db";
import type { Dashboard, DashboardDataset } from "./types";

export type { Dashboard, DashboardDataset } from "./types";

type DashboardRow = Omit<Dashboard, "datasets">;

function toDashboard(row: DashboardRow, datasets: DashboardDataset[]): Dashboard {
  return {
    id: row.id,
    ten: row.ten,
    mo_ta: row.mo_ta,
    cong_cu: row.cong_cu,
    url: row.url,
    route: row.route ?? "",
    chu_so_huu: row.chu_so_huu,
    phong_ban: row.phong_ban,
    doi_tuong: row.doi_tuong,
    tan_suat: row.tan_suat,
    phan_loai_bao_mat: row.phan_loai_bao_mat,
    trang_thai: row.trang_thai,
    anh_bia: row.anh_bia,
    cap_nhat_lan_cuoi: row.cap_nhat_lan_cuoi || undefined,
    datasets,
  };
}

const SELECT_COLS = `id, ten, mo_ta, cong_cu, url, route, chu_so_huu, phong_ban, doi_tuong,
                     tan_suat, phan_loai_bao_mat, trang_thai, anh_bia, cap_nhat_lan_cuoi`;

export async function getDashboards(): Promise<Dashboard[]> {
  const [rows, links] = await Promise.all([
    query<DashboardRow>(
      `SELECT ${SELECT_COLS} FROM catalog.dashboards ORDER BY sort_order, ten`
    ),
    query<DashboardDataset & { dashboard_id: string }>(
      `SELECT dashboard_id, dataset_id, vai_tro, ghi_chu
         FROM catalog.dashboard_datasets ORDER BY dashboard_id, dataset_id`
    ),
  ]);

  const byDash = new Map<string, DashboardDataset[]>();
  for (const l of links) {
    const list = byDash.get(l.dashboard_id) ?? [];
    list.push({ dataset_id: l.dataset_id, vai_tro: l.vai_tro, ghi_chu: l.ghi_chu });
    byDash.set(l.dashboard_id, list);
  }

  return rows.map((r) => toDashboard(r, byDash.get(r.id) ?? []));
}

export async function getDashboard(id: string): Promise<Dashboard | undefined> {
  const rows = await query<DashboardRow>(
    `SELECT ${SELECT_COLS} FROM catalog.dashboards WHERE id = $1`,
    [id]
  );
  if (!rows.length) return undefined;
  const links = await query<DashboardDataset>(
    `SELECT dataset_id, vai_tro, ghi_chu FROM catalog.dashboard_datasets
      WHERE dashboard_id = $1 ORDER BY dataset_id`,
    [id]
  );
  return toDashboard(rows[0], links);
}

// ---- Mutations (dùng bởi admin) ----

export type DashboardInput = Dashboard;

export async function saveDashboard(d: DashboardInput): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO catalog.dashboards
         (id, ten, mo_ta, cong_cu, url, route, chu_so_huu, phong_ban, doi_tuong, tan_suat,
          phan_loai_bao_mat, trang_thai, anh_bia, cap_nhat_lan_cuoi, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now())
       ON CONFLICT (id) DO UPDATE SET
         ten=$2, mo_ta=$3, cong_cu=$4, url=$5, route=$6, chu_so_huu=$7, phong_ban=$8,
         doi_tuong=$9, tan_suat=$10, phan_loai_bao_mat=$11, trang_thai=$12,
         anh_bia=$13, cap_nhat_lan_cuoi=$14, updated_at=now()`,
      [
        d.id, d.ten, d.mo_ta, d.cong_cu, d.url, d.route, d.chu_so_huu, d.phong_ban,
        d.doi_tuong, d.tan_suat, d.phan_loai_bao_mat, d.trang_thai, d.anh_bia,
        d.cap_nhat_lan_cuoi ?? "",
      ]
    );
    await client.query(`DELETE FROM catalog.dashboard_datasets WHERE dashboard_id = $1`, [d.id]);
    for (const l of d.datasets) {
      await client.query(
        `INSERT INTO catalog.dashboard_datasets (dashboard_id, dataset_id, vai_tro, ghi_chu)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (dashboard_id, dataset_id) DO UPDATE SET vai_tro=$3, ghi_chu=$4`,
        [d.id, l.dataset_id, l.vai_tro, l.ghi_chu]
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

export async function deleteDashboard(id: string): Promise<void> {
  await query(`DELETE FROM catalog.dashboards WHERE id = $1`, [id]);
}

export async function dashboardExists(id: string): Promise<boolean> {
  const rows = await query(`SELECT 1 FROM catalog.dashboards WHERE id = $1`, [id]);
  return rows.length > 0;
}
