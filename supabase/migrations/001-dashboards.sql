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

-- Ghi chú lịch sử: bản đầu có thêm 2 bảng charts / chart_queries để ghép chart
-- qua form trong admin. Cách đó đã bỏ (dashboard giờ là trang code ở /bang/…),
-- nên migration 004 thêm cột dashboards.route và script drop-chart-tables.mjs
-- xoá 2 bảng đó. Cài mới thì bỏ qua chúng, chỉ chạy tới đây rồi sang 002/003/004.
