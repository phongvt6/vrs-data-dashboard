-- Lưu trữ: xoá dataset/dashboard thì không mất hẳn, mà chụp lại toàn bộ vào đây
-- để sau còn phục hồi. Chạy 1 lần, an toàn khi chạy lại.
--
-- du_lieu chứa NGUYÊN bản ghi cùng mọi thứ phụ thuộc vào nó:
--   dataset   → dataset + columns + relationships + link tới dashboard
--   dashboard → dashboard + link dataset + charts + chart_queries

create schema if not exists catalog;

create table if not exists catalog.archive (
  id         bigserial primary key,
  loai       text not null,              -- dataset | dashboard
  doi_tuong_id text not null,            -- id gốc, để biết phục hồi về đâu
  ten        text not null default '',   -- tên lúc xoá, để nhìn danh sách còn hiểu
  du_lieu    jsonb not null,
  xoa_luc    timestamptz not null default now(),
  ghi_chu    text not null default ''
);

create index if not exists archive_loai_idx on catalog.archive (loai, xoa_luc desc);
create index if not exists archive_doi_tuong_idx on catalog.archive (doi_tuong_id);
