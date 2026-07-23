import "server-only";
import { Pool } from "pg";

// Kết nối Postgres (Supabase). Chỉ chạy phía server — không bao giờ lộ ra client.
// Connection string: Supabase → Project Settings → Database → Connection string (URI).
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

const isLocal = !!connectionString && /localhost|127\.0\.0\.1/.test(connectionString);

// Giữ 1 pool duy nhất qua các lần hot-reload dev.
const globalForPg = globalThis as unknown as { _vdcPool?: Pool };

export const pool =
  globalForPg._vdcPool ??
  new Pool({
    connectionString,
    // Supabase yêu cầu SSL; rejectUnauthorized:false để khỏi vướng chứng chỉ.
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 5,
  });

if (!globalForPg._vdcPool) globalForPg._vdcPool = pool;

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  if (!connectionString) {
    throw new Error(
      "Chưa cấu hình DATABASE_URL / SUPABASE_DB_URL. Xem .env.example và README (mục Đăng nhập & Database)."
    );
  }
  const res = await pool.query(text, params as unknown[]);
  return res.rows as T[];
}
