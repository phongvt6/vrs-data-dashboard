-- Schema "mart": bản sao dữ liệu thật, kéo từ Google Sheets về Postgres.
--
-- Vì sao cần: Sheets của công ty tới 58k dòng. Đọc thẳng Sheets mỗi lần mở
-- dashboard thì chậm và đụng hạn mức API, lại không JOIN được giữa các sheet.
-- Kéo về đây một lần theo lịch, dashboard query bằng SQL thật.
--
-- Mỗi dataset trong catalog có nguon_ref kiểu sheets sẽ thành MỘT bảng ở đây,
-- tên bảng = id của dataset (mart.data_doanh_thu, mart.data_tlx…).
-- Các bảng đó do `npm run sync` tạo/ghi đè, không khai báo tay ở file này.

create schema if not exists mart;

-- Nhật ký đồng bộ: lần cuối chạy, bao nhiêu dòng, có lỗi gì.
create table if not exists mart._sync (
  dataset_id text primary key,
  bang       text not null default '',
  luc        timestamptz not null default now(),
  so_dong    bigint not null default 0,
  so_cot     int not null default 0,
  kieu_cot   jsonb not null default '{}'::jsonb,  -- {ten_cot: "numeric"|"date"|"text"}
  ghi_chu    text not null default ''
);
