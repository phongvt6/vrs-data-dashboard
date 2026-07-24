-- Kho khóa–giá trị dùng chung cho các dashboard code (thay Cloudflare KV /
-- Supabase-REST của app nhân viên). Dashboard "Doanh thu tự doanh" dùng để lưu:
--   note:<key>     — ghi chú bối cảnh dùng chung theo trang+kỳ
--   storemap:v1    — khai báo sáp nhập / đổi tên quầy (quy mã cũ về mã chuẩn)
--
-- Chạy 1 lần trên Supabase SQL Editor. An toàn khi chạy lại.

create schema if not exists catalog;

create table if not exists catalog.kv (
  k          text primary key,
  v          text not null default '',
  updated_at timestamptz not null default now()
);
