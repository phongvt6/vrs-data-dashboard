"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Thanh lọc dùng chung cho dashboard. Trạng thái nằm trên URL (searchParams),
// nên chia sẻ link là chia sẻ đúng bộ lọc, và nút back của trình duyệt chạy tự
// nhiên. Server component đọc lại từ searchParams — xem src/lib/loc.ts.

export type ChonNhieu = {
  khoa: string;
  nhan: string;
  /** Chip khi ít giá trị (≤ ~6), dropdown khi nhiều. */
  kieu: "chip" | "chon";
  values: string[];
};

const NHANH = [
  { nhan: "Tháng này", ky: "thang" },
  { nhan: "Quý này", ky: "quy" },
  { nhan: "Năm nay", ky: "nam" },
  { nhan: "12 tháng", ky: "12thang" },
];

/** Mốc ngày cho nút nhanh — tính ở client theo hôm nay của người xem. */
function khoangNhanh(ky: string): { tu: string; den: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const den = iso(now);
  const y = now.getFullYear();
  const m = now.getMonth();
  if (ky === "thang") return { tu: iso(new Date(y, m, 1)), den };
  if (ky === "quy") return { tu: iso(new Date(y, Math.floor(m / 3) * 3, 1)), den };
  if (ky === "nam") return { tu: iso(new Date(y, 0, 1)), den };
  return { tu: iso(new Date(y - 1, m, now.getDate())), den }; // 12 tháng
}

export default function ThanhLoc({ boLoc }: { boLoc: ChonNhieu[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const cur = useMemo(() => {
    const o: Record<string, string> = {};
    sp.forEach((v, k) => (o[k] = v));
    return o;
  }, [sp]);

  // Đổi URL nhưng KHÔNG cuộn lên đầu — người xem đang nhìn một chart cụ thể.
  const dat = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(cur);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const chonValues = (khoa: string) => (cur[khoa] ? cur[khoa].split("~") : []);
  const doiChon = (khoa: string, val: string) => {
    const cur2 = chonValues(khoa);
    const next = cur2.includes(val) ? cur2.filter((x) => x !== val) : [...cur2, val];
    dat({ [khoa]: next.length ? next.join("~") : undefined });
  };

  const coLoc = Object.keys(cur).length > 0;

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
        padding: "10px 0", marginBottom: 8,
      }}
    >
      {/* Khoảng ngày */}
      <input
        type="date"
        value={cur.tu ?? ""}
        onChange={(e) => dat({ tu: e.target.value || undefined })}
        style={inp}
        aria-label="Từ ngày"
      />
      <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>→</span>
      <input
        type="date"
        value={cur.den ?? ""}
        onChange={(e) => dat({ den: e.target.value || undefined })}
        style={inp}
        aria-label="Đến ngày"
      />

      {NHANH.map((n) => (
        <button key={n.ky} onClick={() => dat(khoangNhanh(n.ky))} style={btn}>
          {n.nhan}
        </button>
      ))}

      <span style={{ width: 1, height: 22, background: "var(--line)", margin: "0 4px" }} />

      {boLoc.map((f) =>
        f.kieu === "chip" ? (
          <div key={f.khoa} style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{f.nhan}:</span>
            {f.values.map((v) => {
              const on = chonValues(f.khoa).includes(v);
              return (
                <button
                  key={v}
                  onClick={() => doiChon(f.khoa, v)}
                  style={{
                    ...chip,
                    border: "1px solid " + (on ? "var(--accent)" : "var(--line-strong)"),
                    background: on ? "var(--accent)" : "var(--panel)",
                    color: on ? "#fff" : "var(--ink-soft)",
                  }}
                >
                  {v}
                </button>
              );
            })}
          </div>
        ) : (
          <select
            key={f.khoa}
            value=""
            onChange={(e) => { if (e.target.value) doiChon(f.khoa, e.target.value); }}
            style={{ ...inp, maxWidth: 190 }}
            aria-label={f.nhan}
          >
            <option value="">
              {f.nhan}
              {chonValues(f.khoa).length ? ` (${chonValues(f.khoa).length})` : ""}…
            </option>
            {f.values.map((v) => (
              <option key={v} value={v}>{chonValues(f.khoa).includes(v) ? "✓ " : ""}{v}</option>
            ))}
          </select>
        )
      )}

      {coLoc && (
        <button
          onClick={() => router.replace(pathname, { scroll: false })}
          style={{ ...btn, color: "#b5423a", borderColor: "#e0b4b0" }}
        >
          Xoá lọc
        </button>
      )}
    </div>
  );
}

const inp = {
  padding: "6px 10px", fontSize: 13, border: "1px solid var(--line-strong)",
  borderRadius: 7, background: "var(--panel)", outline: "none", color: "var(--ink)",
} as const;
const btn = {
  padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
  borderRadius: 7, border: "1px solid var(--line-strong)",
  background: "var(--panel)", color: "var(--ink-soft)",
} as const;
const chip = {
  padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 999,
} as const;
