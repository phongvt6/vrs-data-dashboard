import "server-only";
import { query } from "./db";
import type { SourceType, SourceView } from "./types";

type SourceRow = {
  id: string;
  type: SourceType;
  label: string;
  nguon: string;
  enabled: boolean;
  config: Record<string, unknown>;
  secret: string;
  last_sync_at: string;
  last_sync_note: string;
};

// Nguồn kèm secret — CHỈ dùng phía server (khi đồng bộ). Không trả ra client.
export type SourceFull = SourceRow;

function toView(r: SourceRow): SourceView {
  return {
    id: r.id,
    type: r.type,
    label: r.label,
    nguon: r.nguon,
    enabled: r.enabled,
    config: r.config ?? {},
    hasSecret: !!r.secret,
    last_sync_at: r.last_sync_at || undefined,
    last_sync_note: r.last_sync_note || undefined,
  };
}

export async function getSources(): Promise<SourceView[]> {
  const rows = await query<SourceRow>(`SELECT * FROM catalog.sources ORDER BY created_at`);
  return rows.map(toView);
}

export async function getSourceView(id: string): Promise<SourceView | undefined> {
  const rows = await query<SourceRow>(`SELECT * FROM catalog.sources WHERE id = $1`, [id]);
  return rows[0] ? toView(rows[0]) : undefined;
}

// Kèm secret — chỉ gọi trong sync (server).
export async function getSourceFull(id: string): Promise<SourceFull | undefined> {
  const rows = await query<SourceRow>(`SELECT * FROM catalog.sources WHERE id = $1`, [id]);
  return rows[0];
}

export type SourceInput = {
  id: string;
  type: SourceType;
  label: string;
  nguon: string;
  enabled: boolean;
  config: Record<string, unknown>;
  secret: string; // rỗng khi sửa mà không đổi = giữ secret cũ
};

export async function saveSource(s: SourceInput): Promise<void> {
  await query(
    `INSERT INTO catalog.sources (id, type, label, nguon, enabled, config, secret)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO UPDATE SET
       type=$2, label=$3, nguon=$4, enabled=$5, config=$6,
       -- secret rỗng khi sửa -> giữ secret cũ
       secret=CASE WHEN excluded.secret = '' THEN catalog.sources.secret ELSE excluded.secret END`,
    [s.id, s.type, s.label, s.nguon, s.enabled, JSON.stringify(s.config), s.secret]
  );
}

export async function deleteSource(id: string): Promise<void> {
  await query(`DELETE FROM catalog.sources WHERE id = $1`, [id]);
}

export async function setSyncStatus(id: string, at: string, note: string): Promise<void> {
  await query(`UPDATE catalog.sources SET last_sync_at=$2, last_sync_note=$3 WHERE id=$1`, [
    id,
    at,
    note,
  ]);
}
