import "server-only";
import { pool, query } from "./db";
import type { Chart, Dashboard, DashboardDataset } from "./types";

export type { Chart, Dashboard, DashboardDataset } from "./types";

type DashboardRow = Omit<Dashboard, "datasets">;

function toDashboard(row: DashboardRow, datasets: DashboardDataset[]): Dashboard {
  return {
    id: row.id,
    ten: row.ten,
    mo_ta: row.mo_ta,
    cong_cu: row.cong_cu,
    url: row.url,
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

const SELECT_COLS = `id, ten, mo_ta, cong_cu, url, chu_so_huu, phong_ban, doi_tuong,
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

export async function getCharts(dashboardId: string): Promise<Chart[]> {
  return query<Chart>(
    `SELECT id, dashboard_id, tieu_de, loai, mo_ta, config, pos, w, h
       FROM catalog.charts WHERE dashboard_id = $1 ORDER BY pos, id`,
    [dashboardId]
  );
}

export async function getChart(id: string): Promise<Chart | undefined> {
  const rows = await query<Chart>(
    `SELECT id, dashboard_id, tieu_de, loai, mo_ta, config, pos, w, h
       FROM catalog.charts WHERE id = $1`,
    [id]
  );
  return rows[0];
}

export async function saveChart(ch: Chart): Promise<void> {
  await query(
    `INSERT INTO catalog.charts (id, dashboard_id, tieu_de, loai, mo_ta, config, pos, w, h, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
     ON CONFLICT (id) DO UPDATE SET
       tieu_de=$3, loai=$4, mo_ta=$5, config=$6, pos=$7, w=$8, h=$9, updated_at=now()`,
    [ch.id, ch.dashboard_id, ch.tieu_de, ch.loai, ch.mo_ta, JSON.stringify(ch.config ?? {}), ch.pos, ch.w, ch.h]
  );
}

export async function deleteChart(id: string): Promise<void> {
  await query(`DELETE FROM catalog.charts WHERE id = $1`, [id]);
}

/** Đổi chỗ chart với chart liền kề theo thứ tự hiển thị. */
export async function moveChart(id: string, dir: -1 | 1): Promise<string | undefined> {
  const ch = await getChart(id);
  if (!ch) return undefined;
  const list = await getCharts(ch.dashboard_id);
  const i = list.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return ch.dashboard_id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Ghi lại pos cho cả danh sách: pos cũ có thể trùng nhau (mặc định 0).
    const sau = [...list];
    [sau[i], sau[j]] = [sau[j], sau[i]];
    for (let k = 0; k < sau.length; k++) {
      await client.query(`UPDATE catalog.charts SET pos = $1 WHERE id = $2`, [k, sau[k].id]);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return ch.dashboard_id;
}

// Số chart theo dashboard, 1 truy vấn cho cả danh sách.
export async function countChartsByDashboard(): Promise<Record<string, number>> {
  const rows = await query<{ dashboard_id: string; n: string }>(
    `SELECT dashboard_id, count(*) AS n FROM catalog.charts GROUP BY dashboard_id`
  );
  return Object.fromEntries(rows.map((r) => [r.dashboard_id, Number(r.n) || 0]));
}

// ---- Mutations (dùng bởi admin) ----

export type DashboardInput = Dashboard;

export async function saveDashboard(d: DashboardInput): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO catalog.dashboards
         (id, ten, mo_ta, cong_cu, url, chu_so_huu, phong_ban, doi_tuong, tan_suat,
          phan_loai_bao_mat, trang_thai, anh_bia, cap_nhat_lan_cuoi, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now())
       ON CONFLICT (id) DO UPDATE SET
         ten=$2, mo_ta=$3, cong_cu=$4, url=$5, chu_so_huu=$6, phong_ban=$7,
         doi_tuong=$8, tan_suat=$9, phan_loai_bao_mat=$10, trang_thai=$11,
         anh_bia=$12, cap_nhat_lan_cuoi=$13, updated_at=now()`,
      [
        d.id, d.ten, d.mo_ta, d.cong_cu, d.url, d.chu_so_huu, d.phong_ban,
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
