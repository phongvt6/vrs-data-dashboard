# Quy định dựng dashboard (design system)

Mục tiêu: mọi dashboard native trông **đồng bộ** và **đỡ lỗi vặt**, vì cùng ăn một
bộ token + một bộ khung + một thư viện chart. Dashboard mới **ráp lego** từ
`src/dashboard/`, không tự chế sidebar / thẻ / bảng màu.

> Bài học vì sao có file này: dashboard "Doanh thu tự doanh" ban đầu tự viết
> sidebar + `charts.tsx` + màu riêng → lệch hẳn (sidebar giãn hỏng, chữ trục 11px,
> accent teal chửi nhau với cột xanh). Gốc: **3 hệ tô màu + 2 thư viện chart chạy
> song song**. Quy định dưới đây gộp về MỘT.

---

## 1. Một nguồn sự thật: `src/chart/lib/theme.ts`

- **Màu**: `SERIES` (8 slot mù-màu), `CHROME` (nền/mực/kẻ), `STATUS`, `DIVERGING`…
  Gán màu theo **thực thể** (tên), theo đúng thứ tự slot, không xoay vòng.
- **Cỡ chữ**: hằng `FONT` — **sàn 12px**, không có chữ nào nhỏ hơn trên dashboard.
  Trục/legend 12.5, tooltip 13, nhãn số 12, tiêu đề thẻ 15, số KPI 28.
- Sửa màu/cỡ chữ → sửa Ở ĐÂY, cả app đổi theo. Port tĩnh (`public/*`) đồng bộ qua
  `npm run kit` (sinh `public/_kit/`).

## 2. Token CSS: `src/dashboard/tokens.ts`

- `dsVars(mode)` biến theme.ts thành biến CSS `--ds-*` (màu + thang chữ). `<DashboardShell>`
  áp lên gốc → mọi thứ bên trong dùng `var(--ds-ink)`, `var(--ds-series-1)`…
- Trong phạm vi shell, các biến **cũ** (`--panel`, `--line`, `--accent`, `--ink-soft`…)
  được alias về `--ds-*`, nên code cũ tự khớp bảng màu, không phải sửa tay.
- Accent của dashboard = `--ds-series-1` (xanh dương của biểu đồ) → chrome khớp dữ liệu.

## 3. Khung + primitive: `src/dashboard/`

| Dùng | Component |
| --- | --- |
| Khung trang (sidebar trái + header + main) | `Shell.tsx` → `<DashboardShell nav active onNavigate title subtitle right>` |
| Lưới 12 cột | `<Grid>` |
| Thẻ nội dung (có badge ⓘ) | `<Card w title note right mau>` |
| Thẻ KPI / thẻ số | `<Kpi>` / `<Stat>` |
| Bảng | `<DataTable cols>` |
| Trạng thái | `<Loading>` / `<Loi>` |

**Không** dashboard nào tự vẽ sidebar/thẻ nữa. Cần khác biệt thì thêm prop vào
primitive dùng chung, đừng fork.

## 4. Chart: `src/chart/` + truy xuất mẫu

- Loại chuẩn: `<ChartTile loai rows config>` — đọc taxonomy 14 loại trong
  `src/chart/types.ts` (`CHART_TYPES`, mỗi loại có "nên dùng / tránh").
- Chart đặc thù (donut có tổng ở giữa, combo 2 trục…) được viết riêng, nhưng cỡ
  chữ vẫn đọc từ `FONT`.
- **Bắt buộc khai mẫu**: mỗi ô chart truyền `mau="<id loại trong CHART_TYPES>"` cho
  `Card`. Card hiện **badge ⓘ** ở góc + gắn `data-chart-type` vào DOM. Bấm ⓘ mở
  `/charts#<id>` — thư viện chart, đọc hướng dẫn loại đó.

## 4b. Taxonomy chart sync từ `ui-chart-catalog`

Danh mục loại chart + hướng dẫn ("nên dùng / tránh") **không maintain tay ở đây** —
nó là bản sinh tự động từ app **ui-chart-catalog** (nguồn sự thật, nơi thêm chart mới):

- `src/chart/catalog.generated.ts` (JOBS + CHART_TYPES) — **TỰ SINH, đừng sửa tay**.
- `src/chart/types.ts` chỉ giữ kiểu + helper, re-export dữ liệu đã sinh.
- Quy trình: bên catalog chạy `npm run emit-meta` → `chart-catalog.meta.json`; bên này
  chạy `npm run sync-charts` (đọc từ `../ui-chart-catalog`) → sinh lại + **cảnh báo**
  loại catalog có mà vrs chưa có renderer.
- vrs chỉ RENDER một tập con (14/56) — mỗi loại cần một `case` trong `options.ts`.
  Muốn thêm: viết renderer + sample, thêm id vào `SUPPORTED` trong
  `scripts/sync-chart-catalog.mjs`, chạy lại `npm run sync-charts`.
- **Không** đưa `sync-charts` vào prebuild (Vercel không có repo catalog cạnh bên);
  file sinh đã commit nên build dùng bản đó.

## 5. Thư viện sống: `/charts`

- `src/app/_components/ChartLibrary.tsx` render **chính component thật** (không demo
  tay) cho từng loại, có `id` neo → badge ⓘ nhảy trúng thẻ và highlight (`:target`).
- Vì render bằng component thật, "thư viện" và "chart trên dashboard" không trôi khỏi
  nhau.

---

## Checklist dựng dashboard mới

1. `page.tsx` = shell RSC tĩnh, render `<XxxApp/>` (client).
2. `XxxApp` bọc trong `<DashboardShell nav=…>`; KHÔNG tự viết sidebar.
3. Bố cục bằng `<Grid>` + `<Card>`; số bằng `<Kpi>/<Stat>`; bảng bằng `<DataTable>`.
4. Mỗi chart: chọn loại trong `CHART_TYPES`, truyền `mau="<id>"` cho Card.
5. Màu/chữ: chỉ dùng `var(--ds-*)` hoặc token từ `theme.ts`. Không hardcode hex,
   không đặt cỡ chữ < 12px.
6. Trang đọc DB: thêm `await connection()` trong component async (xem
   `vrs-build-doc-db-connection` trong memory).
