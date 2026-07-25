"use client";

// View "Danh sách hàng hóa" — dữ liệu từ /api/tu-doanh/catalog.
// Bộ lọc FACET RIÊNG (Trạm/Điểm trạm/Bộ phận + Cửa hàng), liên thông qua API
// cascade. Dùng filter.group + filter.from/to từ filter chung. Insight danh mục
// · bảng chi tiết SKU · panel cửa hàng. Phong cách như Overview.tsx.

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Catalog, Filter, Meta } from "../lib/api";
import { api, toQuery } from "../lib/api";
import type { PeriodType } from "../filter";
import { Grid, Cell, Loading, Loi, Bang } from "../ui";
import { colorMap } from "../lib/colors";
import { tien, so, share as pctShare, fmtPct } from "../lib/format";
import { Insight } from "./insight";

type Base = "prevW" | "prevWY" | "prevM" | "prevY";

/* Mốc so sánh bám theo LOẠI KỲ (như BASE_BY_PERIOD của bản gốc). */
function baseOptions(pt: PeriodType): { k: Base; l: string }[] {
  if (pt === "week") return [{ k: "prevW", l: "tuần trước" }, { k: "prevWY", l: "cùng kỳ tuần năm trước" }];
  if (pt === "year") return [{ k: "prevY", l: "lũy kế năm trước" }];
  return [{ k: "prevM", l: "tháng trước" }, { k: "prevY", l: "cùng kỳ năm trước" }];
}

export default function CatalogView({ filter, periodType }: { filter: Filter; meta: Meta; periodType: PeriodType }) {
  const [catTram, setCatTram] = useState<string[]>([]);
  const [catDiem, setCatDiem] = useState<string[]>([]);
  const [catBp, setCatBp] = useState<string[]>([]);
  const [catStore, setCatStore] = useState<string[]>([]);
  const [catBase, setCatBase] = useState<Base>("prevM");
  const [catSearch, setCatSearch] = useState("");
  const [storeSearch, setStoreSearch] = useState("");
  const [hideStores, setHideStores] = useState(false);

  const [d, setD] = useState<Catalog | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // Mốc so sánh phải hợp lệ với loại kỳ hiện tại.
  const opts = baseOptions(periodType);
  useEffect(() => {
    if (!opts.find((o) => o.k === catBase)) setCatBase(opts[0].k);
  }, [periodType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const q = toQuery(
      filter,
      { base: catBase, tram: catTram.join(","), diem: catDiem.join(","), bp: catBp.join(","), store: catStore.join(",") },
      ["group"]
    );
    api<Catalog>("catalog", q)
      .then((r) => alive && (setD(r), setErr("")))
      .catch((e) => alive && setErr(String(e.message ?? e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [filter, catBase, catTram, catDiem, catBp, catStore]);

  if (err) return <Loi e={err} />;
  if (loading || !d) return <Loading cao={400} />;

  const baseLabel = (opts.find((o) => o.k === catBase) ?? opts[0]).l;

  // Chọn facet → reset lựa chọn cửa hàng (như bản gốc), API tự cascade.
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const onFacet = {
    tram: { sel: catTram, toggle: (v: string) => { setCatTram(toggle(catTram, v)); setCatStore([]); }, only: (v: string) => { setCatTram([v]); setCatStore([]); } },
    diem: { sel: catDiem, toggle: (v: string) => { setCatDiem(toggle(catDiem, v)); setCatStore([]); }, only: (v: string) => { setCatDiem([v]); setCatStore([]); } },
    bp: { sel: catBp, toggle: (v: string) => { setCatBp(toggle(catBp, v)); setCatStore([]); }, only: (v: string) => { setCatBp([v]); setCatStore([]); } },
  } as const;

  // Màu chấm theo nhóm (ổn định theo doanh thu nhóm giảm dần).
  const cGroup = colorMap([...d.groups].sort((a, b) => b.dt - a.dt).map((g) => g.group));

  // Lọc client cho bảng SKU + panel cửa hàng.
  const qCat = catSearch.trim().toLowerCase();
  const skus = qCat
    ? d.skus.filter((s) => s.sku.toLowerCase().includes(qCat) || s.ten.toLowerCase().includes(qCat))
    : d.skus;
  const tot = skus.reduce((a, s) => ({ dt: a.dt + s.dt, sl: a.sl + s.sl }), { dt: 0, sl: 0 });

  const qStore = storeSearch.trim().toLowerCase();
  const stores = qStore ? d.stores.filter((s) => s.store.toLowerCase().includes(qStore)) : d.stores;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* 1 · Diễn giải danh mục */}
      <Insight lines={insightCat(d)} tieu_de="✦ Phân tích danh mục" />

      {/* 2 · Ba bộ lọc facet liên thông */}
      <Grid>
        <Cell w={4} title="Trạm" note={`${d.trams.length} trạm`}>
          <FacetList items={d.trams} sel={onFacet.tram.sel} onToggle={onFacet.tram.toggle} onOnly={onFacet.tram.only} />
        </Cell>
        <Cell w={4} title="Điểm trạm" note={`${d.diems.length} điểm trạm`}>
          <FacetList items={d.diems} sel={onFacet.diem.sel} onToggle={onFacet.diem.toggle} onOnly={onFacet.diem.only} />
        </Cell>
        <Cell w={4} title="Bộ phận" note={`${d.bps.length} bộ phận`}>
          <FacetList items={d.bps} sel={onFacet.bp.sel} onToggle={onFacet.bp.toggle} onOnly={onFacet.bp.only} />
        </Cell>
      </Grid>

      {/* 3 · Toolbar: mốc so sánh + tìm SKU + ẩn/hiện cửa hàng */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <Seg opts={opts} value={catBase} onChange={setCatBase} />
        <input
          value={catSearch}
          onChange={(e) => setCatSearch(e.target.value)}
          placeholder="Tìm mã / tên hàng hóa…"
          style={{ flex: "1 1 200px", minWidth: 160, fontSize: 12.5, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line-strong, var(--line))", background: "var(--panel)" }}
        />
        <button style={pillBtn(false)} onClick={() => setHideStores((h) => !h)}>
          {hideStores ? "⇤ Hiện cửa hàng" : "⇥ Ẩn cửa hàng"}
        </button>
      </div>

      {/* 4 · Bảng SKU (+ panel cửa hàng) */}
      <Grid>
        <Cell w={hideStores ? 12 : 7} title="Danh sách chi tiết hàng hóa" note={`${skus.length} mã${filter.group.length ? ` · ${filter.group.join(", ")}` : " · tất cả nhóm"}`}>
          <Bang
            cols={[
              { ten: "#" },
              { ten: "Mã SKU" },
              { ten: "Tên hàng hóa" },
              { ten: "Nhóm" },
              { ten: "Doanh thu", canh: "phai" },
              { ten: "Tỷ trọng", canh: "phai" },
              { ten: "Sản lượng", canh: "phai" },
              { ten: "Đơn giá TB", canh: "phai" },
              { ten: `so ${baseLabel}`, canh: "phai" },
            ]}
          >
            {skus.map((s, i) => (
              <tr key={s.sku} style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
                <td style={{ padding: "6px 8px", color: "var(--ink-soft)" }}>{i + 1}</td>
                <td style={{ padding: "6px 8px", fontVariantNumeric: "tabular-nums" }}>{s.sku}</td>
                <td style={{ padding: "6px 8px", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>{s.ten}</td>
                <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: cGroup(s.group), marginRight: 6, verticalAlign: "middle" }} />
                  {s.group}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>{tien(s.dt)}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--ink-soft)" }}>{pctShare(s.share)}</td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>{so(s.sl)}</td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>{tien(s.donGia)}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: s.momPct == null ? "var(--ink-soft)" : s.momPct >= 0 ? "#006300" : "#d03b3b", fontWeight: 600 }}>{fmtPct(s.momPct)}</td>
              </tr>
            ))}
            {!skus.length && (
              <tr><td colSpan={9} style={{ padding: 16, textAlign: "center", color: "var(--ink-soft)" }}>Không tìm thấy mã hàng.</td></tr>
            )}
            {skus.length > 0 && (
              <tr style={{ borderTop: "2px solid var(--line)", fontWeight: 700 }}>
                <td style={{ padding: "6px 8px" }} />
                <td style={{ padding: "6px 8px", color: "var(--ink-soft)" }} colSpan={3}>Tổng · {skus.length} mã</td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>{tien(tot.dt)}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--ink-soft)" }}>—</td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>{so(tot.sl)}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--ink-soft)" }}>—</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--ink-soft)" }}>—</td>
              </tr>
            )}
          </Bang>
        </Cell>

        {!hideStores && (
          <Cell
            w={5}
            title="Danh sách cửa hàng"
            note={`${stores.length} cửa hàng`}
            right={
              <input
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
                placeholder="Tìm cửa hàng…"
                style={{ width: 150, fontSize: 12, padding: "5px 8px", borderRadius: 8, border: "1px solid var(--line-strong, var(--line))", background: "var(--panel)" }}
              />
            }
          >
            <StorePanel
              stores={stores}
              sel={catStore}
              onToggle={(v) => setCatStore(toggle(catStore, v))}
              onOnly={(v) => setCatStore([v])}
            />
          </Cell>
        )}
      </Grid>
    </div>
  );
}

/* ---- diễn giải nhanh danh mục (theo mẫu insightCat của bản gốc) ---- */
function insightCat(d: Catalog): string[] {
  const tot = d.groups.reduce((a, g) => a + g.dt, 0) || 1;
  const bg = [...d.groups].sort((a, b) => b.dt - a.dt)[0];
  const bs = d.skus[0];
  const lines: string[] = [];
  lines.push(`Danh mục có ${d.skus.length} mã hàng thuộc ${d.groups.length} nhóm, tổng doanh thu kỳ ${tien(tot)}.`);
  if (bg) lines.push(`Nhóm đóng góp lớn nhất: ${bg.group} (${tien(bg.dt)}, ${pctShare(bg.dt / tot)}, ${bg.skuCount} SKU).`);
  if (bs) lines.push(`Mặt hàng bán chạy nhất: ${bs.ten} — ${bs.group} (${tien(bs.dt)}).`);
  return lines;
}

/* ---- danh sách facet: mục có thanh %, click toggle, nút ONLY ---- */
function FacetList({
  items,
  sel,
  onToggle,
  onOnly,
}: {
  items: { name: string; dt: number }[];
  sel: string[];
  onToggle: (v: string) => void;
  onOnly: (v: string) => void;
}) {
  const max = Math.max(1, ...items.map((x) => x.dt));
  if (!items.length) return <div style={{ padding: 10, color: "var(--ink-soft)", fontSize: 12 }}>—</div>;
  return (
    <div style={{ display: "grid", gap: 4, maxHeight: 260, overflowY: "auto" }}>
      {items.map((x) => {
        const on = sel.includes(x.name);
        return <OptRow key={x.name} name={x.name} dt={x.dt} max={max} on={on} onClick={() => onToggle(x.name)} onOnly={() => onOnly(x.name)} />;
      })}
    </div>
  );
}

/* ---- panel cửa hàng: mục {store, diem·bp, dt} + thanh %, toggle, ONLY ---- */
function StorePanel({
  stores,
  sel,
  onToggle,
  onOnly,
}: {
  stores: Catalog["stores"];
  sel: string[];
  onToggle: (v: string) => void;
  onOnly: (v: string) => void;
}) {
  const max = Math.max(1, ...stores.map((s) => s.dt));
  if (!stores.length) return <div style={{ padding: 14, color: "var(--ink-soft)", fontSize: 12 }}>Không có cửa hàng.</div>;
  return (
    <div style={{ display: "grid", gap: 4, maxHeight: 520, overflowY: "auto" }}>
      {stores.map((s) => (
        <OptRow
          key={s.store}
          name={s.store}
          sub={`${s.diem} · ${s.bp}`}
          dt={s.dt}
          max={max}
          on={sel.includes(s.store)}
          onClick={() => onToggle(s.store)}
          onOnly={() => onOnly(s.store)}
        />
      ))}
    </div>
  );
}

/* ---- một mục chọn (facet hoặc cửa hàng) ---- */
function OptRow({
  name,
  sub,
  dt,
  max,
  on,
  onClick,
  onOnly,
}: {
  name: string;
  sub?: string;
  dt: number;
  max: number;
  on: boolean;
  onClick: () => void;
  onOnly: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, cursor: "pointer",
        background: on ? "var(--accent-soft)" : "transparent",
        border: `1px solid ${on ? "var(--accent)" : "transparent"}`,
      }}
    >
      <span
        style={{
          flexShrink: 0, width: 14, height: 14, borderRadius: 4,
          border: `1px solid ${on ? "var(--accent)" : "var(--line-strong, var(--line))"}`,
          background: on ? "var(--accent)" : "transparent",
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: on ? 700 : 600, color: on ? "var(--accent)" : "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
          <span style={{ fontSize: 12, color: "var(--ink-soft)", flexShrink: 0 }}>{tien(dt)}</span>
        </div>
        {sub && <div style={{ fontSize: 10.5, color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>}
        <div style={{ height: 4, borderRadius: 2, background: "var(--line)", marginTop: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.max(3, (dt / max) * 100)}%`, background: "var(--accent)", borderRadius: 2 }} />
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onOnly(); }}
        title="Chỉ xem mục này"
        style={{ flexShrink: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.04em", padding: "3px 6px", borderRadius: 6, border: "1px solid var(--line-strong, var(--line))", background: "var(--panel)", color: "var(--ink-soft)", cursor: "pointer" }}
      >
        ONLY
      </button>
    </div>
  );
}

/* ---- nút nhóm chọn mốc so sánh ---- */
function Seg({ opts, value, onChange }: { opts: { k: Base; l: string }[]; value: Base; onChange: (v: Base) => void }) {
  return (
    <div style={{ display: "inline-flex", gap: 4 }}>
      {opts.map((o) => (
        <button key={o.k} style={pillBtn(o.k === value)} onClick={() => onChange(o.k)}>vs {o.l}</button>
      ))}
    </div>
  );
}

function pillBtn(active: boolean): CSSProperties {
  return {
    fontSize: 12, fontWeight: 600, padding: "5px 11px", borderRadius: 8, cursor: "pointer",
    border: `1px solid ${active ? "var(--accent)" : "var(--line-strong, var(--line))"}`,
    background: active ? "var(--accent)" : "var(--panel)",
    color: active ? "#fff" : "var(--ink)",
    whiteSpace: "nowrap",
  };
}
