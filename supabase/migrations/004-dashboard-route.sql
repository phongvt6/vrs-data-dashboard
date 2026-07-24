-- Bỏ cách ghép chart qua form. Mỗi dashboard giờ là một trang viết bằng code ở
-- /bang/<route>. Thêm cột route để danh mục trỏ thẳng vào trang nội bộ đó.
--
-- Hai bảng charts / chart_queries (dựng cho cách cũ) không còn dùng. File này
-- KHÔNG xoá chúng — việc xoá làm trong script migrate có sao lưu (npm run
-- db:drop-charts) để lỡ cần còn lấy lại.

create schema if not exists catalog;

alter table catalog.dashboards
  add column if not exists route text not null default '';

-- route trỏ tới trang nội bộ, vd 'tu-doanh' → /bang/tu-doanh.
comment on column catalog.dashboards.route is
  'Tên trang dashboard nội bộ dưới /bang/. Rỗng = chỉ có link ra công cụ ngoài.';
