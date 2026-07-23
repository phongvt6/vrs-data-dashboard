-- Giai đoạn 1: thêm phần Dashboard vào schema "catalog" đã có.
-- Chạy 1 lần: Supabase → SQL Editor → dán file này → Run.
-- An toàn khi chạy lại (toàn bộ đều "if not exists").
--
-- 4 bảng:
--   dashboards          — danh mục dashboard công ty (giai đoạn 1 dùng ngay)
--   dashboard_datasets  — dashboard này ăn từ dataset nào (mối nối cho impact analysis)
--   charts              — chart trong từng dashboard (giai đoạn 2 mới dùng)
--   chart_queries       — chart lấy số từ nguồn nào bằng query gì (giai đoạn 3 mới dùng)
--
-- charts/chart_queries tạo sẵn từ bây giờ để giai đoạn 2-3 không phải đập đi làm lại.

create schema if not exists catalog;

create table if not exists catalog.dashboards (
  id                text primary key,
  ten               text not null,
  mo_ta             text not null default '',
  cong_cu           text not null default 'Looker Studio', -- Looker Studio | Power BI | Metabase | Tableau | Nội bộ…
  url               text not null default '',              -- link mở dashboard ở tool gốc
  chu_so_huu        text not null default '',
  phong_ban         text not null default '',
  doi_tuong         text not null default '',              -- ai là người xem (BOD, Sales, Vận hành…)
  tan_suat          text not null default '',
  phan_loai_bao_mat text not null default 'Nội bộ',
  trang_thai        text not null default 'prototype',     -- prototype | production | ngừng dùng
  anh_bia           text not null default '',              -- URL ảnh thumbnail
  layout            jsonb not null default '{"cols": 12}'::jsonb,
  sort_order        int not null default 0,
  cap_nhat_lan_cuoi text not null default '',
  updated_at        timestamptz not null default now()
);

-- Mối nối dashboard ↔ dataset. Đây là lý do chính để gộp 2 danh mục vào một app:
-- trả lời được "dataset này đang nuôi dashboard nào" và ngược lại.
create table if not exists catalog.dashboard_datasets (
  dashboard_id text not null references catalog.dashboards(id) on delete cascade,
  dataset_id   text not null references catalog.datasets(id)   on delete cascade,
  vai_tro      text not null default 'nguồn chính',  -- nguồn chính | nguồn phụ | tham chiếu
  ghi_chu      text not null default '',
  primary key (dashboard_id, dataset_id)
);

create index if not exists dashboard_datasets_dataset_idx
  on catalog.dashboard_datasets (dataset_id);

-- ---- Giai đoạn 2: chart trong dashboard ----
-- loai = mã chart trong thư viện (taxonomy lấy từ app ui-chart-catalog).
-- config = option ECharts đã tuỳ biến cho chart này.
create table if not exists catalog.charts (
  id           text primary key,
  dashboard_id text not null references catalog.dashboards(id) on delete cascade,
  tieu_de      text not null,
  loai         text not null default '',
  mo_ta        text not null default '',
  config       jsonb not null default '{}'::jsonb,
  pos          int not null default 0,   -- thứ tự trong dashboard
  w            int not null default 6,   -- bề ngang theo lưới 12 cột
  h            int not null default 2,
  updated_at   timestamptz not null default now()
);

create index if not exists charts_dashboard_idx on catalog.charts (dashboard_id, pos);

-- ---- Giai đoạn 3: chart lấy số thật ----
-- source_id trỏ sang catalog.sources — chính là connection collector đang dùng
-- để kéo schema, nay dùng lại để chạy query.
create table if not exists catalog.chart_queries (
  chart_id       text primary key references catalog.charts(id)  on delete cascade,
  source_id      text references catalog.sources(id) on delete set null,
  sql            text not null default '',
  params         jsonb not null default '{}'::jsonb,
  cache_ttl_giay int not null default 900,
  last_run_at    text not null default '',
  last_run_note  text not null default ''
);
