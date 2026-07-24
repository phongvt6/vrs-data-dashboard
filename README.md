# Data & Dashboard — Danh mục dữ liệu và dashboard công ty

Công cụ nội bộ cho team data, gồm **hai khu vực dùng chung một database**:

- **Dữ liệu** — liệt kê dataset (BigQuery / Google Sheets / Airtable / Supabase…),
  xem schema từng cột, sơ đồ liên kết (lineage).
- **Dashboard** — liệt kê dashboard công ty đang dùng, mỗi dashboard khai báo
  **nó ăn từ dataset nào**.

Mối nối đó là lý do gộp: từ một dataset thấy ngay dashboard nào sẽ gãy nếu bảng
đổi schema, và ngược lại.

Toàn bộ app **nằm sau đăng nhập** (1 mật khẩu chung), dữ liệu lưu trong **Supabase**.

> App này tách ra từ `vrs-data-catalog` và dùng **cùng một Supabase**. Sau khi
> chuyển hẳn sang đây thì ngừng phát triển app cũ để tránh hai codebase lệch nhau.

## Lộ trình

| Giai đoạn | Nội dung | Trạng thái |
| --- | --- | --- |
| 1 | Danh mục dashboard + mối nối dashboard ↔ dataset | **xong** |
| 2 | Thư viện chart + dựng chart trong dashboard (số liệu mẫu) | **xong** |
| 3 | Chart lấy số thật từ nguồn trong `catalog.sources` | **xong** |

## Chart lấy số thật (giai đoạn 3)

Mỗi chart có thể nối vào một nguồn trong `catalog.sources` — chính các connection
mà collector đang dùng để kéo schema. Chart nào không nối nguồn thì vẫn vẽ bằng
số liệu mẫu, và một chart hỏng không làm trắng cả dashboard.

**Google Sheets** (toàn bộ nguồn hiện tại của công ty): chọn tab → app đọc dòng
tiêu đề và cho chọn cột → chọn phép gộp (cộng/đếm/trung bình/nhỏ nhất/lớn nhất),
sắp xếp, số hạng mục tối đa. Việc gộp nhóm chạy trong app, không cần viết công
thức trong Sheet.

**Postgres / BigQuery**: gõ một câu `SELECT`, rồi khai báo cột nào là hạng mục /
series / giá trị.

Nút **Chạy thử** ngay trong form đổi phần xem trước sang số thật trước khi lưu.

Rào chắn — app chưa có phân quyền theo người dùng nên đây là lớp bảo vệ duy nhất:

- Chỉ nhận **một** câu lệnh, phải bắt đầu bằng `SELECT` hoặc `WITH`
- Chặn mọi từ khoá ghi (`insert`, `update`, `delete`, `drop`, `truncate`…)
- Postgres chạy trong transaction `READ ONLY` + `statement_timeout` 15 giây
- Trần 5.000 dòng cho cả Sheets lẫn SQL
- Kết quả cache trong RAM theo `cache_ttl_giay` của từng chart (mặc định 900 giây)

Phần logic thuần (đổi số kiểu Việt, gộp nhóm, rào chắn SQL) nằm riêng ở
`src/lib/chart-rows.ts` để test được bằng `npm test`.

## Lưu trữ & phục hồi

Xoá dataset hoặc dashboard **không mất hẳn**: app chụp lại bản ghi cùng mọi thứ
phụ thuộc vào nó (cột, liên kết, chart, cấu hình truy vấn) vào `catalog.archive`
rồi mới xoá — cả hai bước trong một transaction. Vào **Quản trị → Lưu trữ** để
phục hồi, hoặc xoá vĩnh viễn.

Chạy migration một lần: dán `supabase/migrations/002-archive.sql` vào SQL Editor.

## Thư viện chart (giai đoạn 2)

Nằm ở `src/chart/`, gồm hai loại mã khác hẳn nhau:

**Bê nguyên từ `ui-chart-catalog`** — sửa ở đây thì nên sửa cả bên đó và ngược lại:

| File | Nội dung |
| --- | --- |
| `lib/theme.ts` | Bảng màu categorical 8 slot (đã kiểm định colorblind-safe), ramp sequential, chrome, định dạng số kiểu Việt |
| `lib/echarts.ts` | Preset khung ECharts: grid, trục, tooltip, legend, hình học của mark |
| `data/sample.ts` | Bộ số liệu mẫu dùng chung, sinh bằng PRNG có seed |
| `EChart.tsx` | Wrapper ECharts, nạp thư viện theo yêu cầu (bỏ phần lọc chéo của bản gốc) |

**Viết mới cho app này** — vì bên kia mỗi chart là demo với số liệu cứng, còn ở
đây chart phải nhận dữ liệu:

| File | Nội dung |
| --- | --- |
| `types.ts` | `ChartRow` (dạng đầu vào chung cho MỌI loại chart), taxonomy 8 nhóm mục đích, metadata 14 loại chart kèm hướng dẫn nên/tránh |
| `options.ts` | Sinh option ECharts từ `ChartRow[]` cho từng loại |
| `sample.ts` | Số liệu mẫu theo loại chart, dùng khi chart chưa nối nguồn |
| `ChartTile.tsx` | Một ô chart; `stat-tile` và `meter` vẽ bằng HTML, còn lại qua ECharts |

14 loại đang vẽ được: ô chỉ số, thanh tiến độ, đường, miền, cột, thanh ngang,
cột nhóm, cột chồng, cột chồng 100%, vành khuyên, waterfall, phễu, bản đồ nhiệt,
phân tán. Các loại còn lại của `ui-chart-catalog` (bảng phân tích, sankey,
treemap, bản đồ, lọc chéo…) chưa port.

Mọi loại chart cùng ăn một dạng dữ liệu `ChartRow[]` (`label` / `series` /
`value` / `value2`) — đó là lý do giai đoạn 3 chỉ phải thay đúng nguồn của
`rows`, không đụng vào bộ render.

## Hệ thiết kế dùng chung cho MỌI dashboard

Có hai kiểu dashboard trong `/bang/`, và một nguồn thiết kế chung cho cả hai:

- **Native** (mẫu chuẩn để nhân rộng) — viết bằng React, dùng thẳng `src/chart/`:
  `<ChartTile>` (ECharts), bảng màu `theme.ts`, engine diễn giải `dien-giai.ts`,
  lưới `<BangKhung>/<Luoi>/<O>`. **`/bang/doanh-thu` là khuôn** — copy nó khi làm
  dashboard mới. Một API chart, một bảng màu, một engine diễn giải.
- **Port tĩnh** (khi đã có app polished sẵn, chỉ muốn nhét vào catalog) —
  `public/<tên>/` + rewrite trong `next.config.ts` + một API route. Hiện có
  `khoan` (từ Cloudflare Worker) và `tu-doanh` (từ app nhân viên).

**`theme.ts` là nguồn sự thật DUY NHẤT về màu + định dạng số.** Native import
thẳng. Port tĩnh không import TS được, nên `npm run kit` (chạy tự động ở
`prebuild`) sinh `public/_kit/` từ `theme.ts`:

| File sinh ra | Dùng cho |
| --- | --- |
| `_kit/theme.css` | biến CSS `--kit-series-1..8`, `--kit-pos/neg` (light + dark) |
| `_kit/palette.js` | `window.KIT`: `series[]`, `colorFor(khoá)` (màu bám thực thể), `vnCompact/vnNumber/vnPercent` |

Port chỉ cần nạp 2 file này rồi trỏ palette + formatter về `KIT` — đổi màu ở
`theme.ts`, chạy lại `npm run kit`, **cả native lẫn port đổi theo**. Kit chỉ đồng
bộ TOKEN (màu, định dạng số), không đụng layout riêng của từng app.

## Cài đặt lần đầu

**1. Tạo bảng trong Supabase**
Supabase → SQL Editor → dán nội dung `supabase/schema.sql` → Run.
(Tạo schema `catalog` với các bảng: datasets, columns, relationships, settings, sources.)

Rồi chạy tiếp phần Dashboard — dán `supabase/migrations/001-dashboards.sql` vào
SQL Editor, hoặc:

```bash
npm run db:dashboards            # tạo 4 bảng dashboard (chạy lại nhiều lần vẫn an toàn)
npm run db:dashboards -- --check # chỉ kiểm tra bảng đã có chưa, không ghi gì
```

Nếu dùng lại Supabase của `vrs-data-catalog` thì **chỉ cần bước này** — các bảng
dataset đã có sẵn.

**2. Khai báo biến môi trường**
Sao chép `.env.example` → `.env.local` rồi điền:

```bash
DATABASE_URL=postgresql://postgres:...@db.xxxx.supabase.co:5432/postgres  # Supabase → Settings → Database → Connection string (URI)
APP_PASSWORD=mat-khau-chung-cua-team     # mật khẩu đăng nhập
AUTH_SECRET=chuoi-ngau-nhien-that-dai    # ký phiên đăng nhập
```

**3. Đổ dữ liệu mẫu + chạy**

```bash
npm install
npm run db:init   # đẩy src/data/catalog.json vào Supabase (chạy 1 lần, chỉ khi DB còn trống)
npm run dev       # mở http://localhost:3002
```

## Các trang

**Dữ liệu**

- `/`                — Danh mục dataset: search theo tên/mô tả/cột, lọc theo nguồn
- `/dataset/[id]`    — Chi tiết: metadata, schema, khóa PK/FK, liên kết, **dashboard đang dùng**
- `/lineage`         — Sơ đồ liên kết (React Flow); node nét đứt là dashboard

**Dashboard**

- `/dashboards`      — Danh mục dashboard: search theo tên/phòng ban/dataset, lọc theo công cụ
- `/dashboard/[id]`  — Chi tiết: metadata, ảnh bìa, dataset nguồn, **lưới chart**, nút mở ở tool gốc
- `/charts`          — Thư viện chart: chọn theo câu hỏi cần trả lời, kèm phần "tránh khi"

**Khác**

- `/admin`            — Quản trị dataset, cột, liên kết, nguồn, cấu hình
- `/admin/dashboards` — Quản trị dashboard (thêm/sửa/xóa, nối dataset)
- `/admin/dashboard/[id]/charts` — Thêm/sửa/xếp thứ tự chart, chọn nguồn dữ liệu, chạy thử
- `/admin/archive`    — Lưu trữ: phục hồi dataset/dashboard đã xoá
- `/login`            — Đăng nhập bằng mật khẩu chung

> Đang phát triển có thể tắt hẳn màn đăng nhập bằng `AUTH_DISABLED=1` trong
> `.env.local`. **Không khai báo biến này trên Vercel** — sẽ mở toang cả `/admin`.

## Dữ liệu nằm ở đâu

Trong **Supabase** (schema `catalog`). Sửa qua trang **Quản trị** trên web —
không cần đụng code. `src/data/catalog.json` chỉ còn là **dữ liệu mẫu để seed**
lần đầu (`npm run db:init`).

Bảng phần Dashboard:

| Bảng | Nội dung |
| --- | --- |
| `dashboards` | danh mục dashboard |
| `dashboard_datasets` | dashboard ↔ dataset (khóa ngoại sang `datasets`) |
| `charts` | chart trong dashboard — *giai đoạn 2* |
| `chart_queries` | chart lấy số ở `sources` nào bằng query gì — *giai đoạn 3* |

## Tự động kéo schema (collector)

Collector kéo schema từ nguồn sống rồi **merge vào Supabase**, **giữ nguyên phần
người gõ trong Quản trị** (mô tả, chủ sở hữu, khóa PK/FK, liên kết). Bảng mới ở
nguồn → tự thêm thành *stub* để team điền metadata sau.

**Nguồn hỗ trợ:** Supabase/Postgres, BigQuery, Airtable, Google Sheets, và
**Google Sheets bản publish** (`sheets_pub`).

Bản publish đọc qua link *File → Share → Publish to web*, **không cần service
account** — đây là đường mà các tool tự làm trong công ty (vd dashboard thưởng
khoán) đang lấy số, nên nối vào đúng đường đó thì hai bên luôn nhìn cùng một con
số. Đổi lại, bản publish không có API liệt kê tab nên phải khai tay từng tab
dạng `gid|tên` trong Quản trị → Nguồn dữ liệu. Sau khi đồng bộ schema,
`npm run sync` kéo số thật về `mart` y như nguồn Sheets thường.

```bash
npm run collect              # kéo + merge vào Supabase
npm run collect -- --dry-run # chỉ in thay đổi, không ghi DB
npm test                     # test offline: merge + SQL (pg-mem)
```

Khai báo nguồn trong `scripts/sources.json` (chỉ chứa **tên biến môi trường**,
không chứa secret; bật bằng `enabled: true`). Driver cài khi cần:
`npm i -D pg @google-cloud/bigquery google-auth-library`.

> Collector chỉ sinh **schema** (bảng/cột/kiểu). `relationships` khai báo tay
> trong Quản trị — không tool nào tự suy ra được.

`.github/workflows/collect-schema.yml` chạy theo lịch: collect → merge vào Supabase.
Khai báo Secrets tương ứng ở GitHub (Settings → Secrets and variables → Actions).

## Deploy (Vercel)

Mã nguồn: <https://github.com/phongvt6/vrs-data-dashboard> (private).

App **chưa nối Vercel** — cố ý, để không deploy đè lên project `vrs-data-catalog`
đang chạy. Nối lần đầu:

1. Vercel → **Add New → Project** → Import `phongvt6/vrs-data-dashboard`
2. **Environment Variables** — thêm 3 biến (lấy giá trị trong `.env.local`):

   | Biến | Ghi chú |
   | --- | --- |
   | `DATABASE_URL` | chuỗi Session pooler của Supabase `vrs` |
   | `APP_PASSWORD` | mật khẩu chung để đăng nhập |
   | `AUTH_SECRET` | chuỗi random ký cookie phiên |

3. **Deploy**

> ⚠️ **Đừng khai `AUTH_DISABLED` trên Vercel.** Biến đó chỉ để chạy máy local;
> có nó là mở toang cả `/admin` cho bất kỳ ai có link.

Nối xong thì **push `main` là tự deploy**, không phải làm gì thêm.
