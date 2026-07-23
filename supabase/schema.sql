-- Schema cho app Data & Dashboard trên Supabase.
-- Chạy 1 lần: Supabase → SQL Editor → dán file này → Run,
-- rồi chạy tiếp `migrations/001-dashboards.sql` (phần Dashboard).
-- Đặt trong schema riêng "catalog" để không đụng các bảng khác của bạn.

create schema if not exists catalog;

create table if not exists catalog.datasets (
  id                text primary key,
  ten               text not null,
  nguon             text not null,
  duong_dan         text not null default '',
  chu_so_huu        text not null default '',
  tan_suat          text not null default '',
  phan_loai_bao_mat text not null default 'Nội bộ',
  trang_thai        text not null default 'prototype',
  so_dong           bigint not null default 0,
  mo_ta             text not null default '',
  cap_nhat_lan_cuoi text not null default '',
  nguon_ref         jsonb,
  sort_order        int not null default 0,
  updated_at        timestamptz not null default now()
);

-- Cột của từng dataset, giữ thứ tự bằng "pos".
create table if not exists catalog.columns (
  dataset_id text not null references catalog.datasets(id) on delete cascade,
  pos        int  not null,
  ten        text not null,
  kieu       text not null default '',
  khoa       text not null default '',
  mo_ta      text not null default '',
  primary key (dataset_id, pos)
);

-- Liên kết giữa các dataset (JOIN key / feeds-into...). Khai báo tay.
create table if not exists catalog.relationships (
  id      text primary key,
  from_id text not null references catalog.datasets(id) on delete cascade,
  to_id   text not null references catalog.datasets(id) on delete cascade,
  loai    text not null default '',
  mo_ta   text not null default ''
);

-- Cấu hình chung dạng key/value (vd tiêu đề app...).
create table if not exists catalog.settings (
  key   text primary key,
  value text not null default ''
);

-- Nguồn dữ liệu để collector kéo schema (khai báo & đồng bộ ngay trong app).
-- config: tham số không nhạy cảm (schemas/project/baseId/spreadsheetId...).
-- secret: connection string / token / service-account JSON (chỉ đọc phía server).
create table if not exists catalog.sources (
  id             text primary key,
  type           text not null,              -- postgres | bigquery | airtable | sheets
  label          text not null,
  nguon          text not null default '',   -- nhãn nguồn hiển thị (Supabase/BigQuery...)
  enabled        boolean not null default true,
  config         jsonb not null default '{}'::jsonb,
  secret         text not null default '',
  last_sync_at   text not null default '',
  last_sync_note text not null default '',
  created_at     timestamptz not null default now()
);
