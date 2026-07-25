"use client";

// Lớp ADAPTER mỏng: giữ nguyên chữ ký các primitive mà views tự doanh đang dùng
// (Grid/Cell/Kpi/Stat/Bang/Loading/Loi) nhưng render qua bộ dùng chung
// `@/dashboard/*`. Nhờ vậy các view không phải viết lại, mà vẫn được chuẩn hoá
// màu (--ds-*), thang chữ, và badge ⓘ truy xuất mẫu chart.

import type { CSSProperties, ReactNode } from "react";
import { tien, so, type Delta } from "./lib/format";
import { Grid as DSGrid, Card, Kpi as DSKpi, Stat as DSStat, Loading as DSLoading, Loi as DSLoi } from "@/dashboard/layout";
import { DataTable, type Col } from "@/dashboard/DataTable";

export function Grid({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <DSGrid style={style}>{children}</DSGrid>;
}

/** Ô lưới 12 cột. `mau` = id loại chart trong thư viện → hiện badge ⓘ. */
export function Cell({
  w = 6,
  title,
  note,
  right,
  mau,
  children,
  pad = true,
}: {
  w?: number;
  title?: string;
  note?: string;
  right?: ReactNode;
  mau?: string;
  children: ReactNode;
  pad?: boolean;
}) {
  return (
    <Card w={w} title={title} note={note} right={right} mau={mau} pad={pad}>
      {children}
    </Card>
  );
}

/** Thẻ KPI — chữ ký cũ (giaTri số + hàm định dạng + deltas kiểu Delta). */
export function Kpi({
  nhan,
  giaTri,
  dinhDang = tien,
  deltas = [],
  phu,
}: {
  nhan: string;
  giaTri: number;
  dinhDang?: (n: number) => string;
  deltas?: { nhan: string; d: Delta }[];
  phu?: ReactNode;
}) {
  return (
    <DSKpi
      nhan={nhan}
      giaTri={dinhDang(giaTri)}
      deltas={deltas.map((x) => ({ nhan: x.nhan, pct: x.d.pct, good: x.d.good }))}
      phu={phu}
      mau=""
    />
  );
}

export function Stat({ nhan, giaTri, phu }: { nhan: string; giaTri: string; phu?: ReactNode }) {
  return <DSStat nhan={nhan} giaTri={giaTri} phu={phu} />;
}

export function Loading({ cao = 200 }: { cao?: number }) {
  return <DSLoading cao={cao} />;
}

export function Loi({ e }: { e: string }) {
  return <DSLoi e={e} />;
}

/** Bảng đơn giản — chữ ký cũ (cols + rows children). */
export function Bang({ cols, children }: { cols: Col[]; children: ReactNode }) {
  return <DataTable cols={cols}>{children}</DataTable>;
}

export const num = so;
