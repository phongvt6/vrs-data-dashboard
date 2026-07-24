# Việc còn lại

Cập nhật 2026-07-23. Xếp theo thứ tự nên làm.

---

## 1. Chặn trước khi làm tiếp — cần bạn cung cấp

- [ ] **Service account JSON của BigQuery** (biến `GCP_SA_KEY` bên repo
      `doanh-thu-tu-doanh`). Dán vào `.env.local`, hoặc tự thêm trong app:
      **Quản trị → Nguồn dữ liệu → Thêm nguồn** → BigQuery,
      Project `gwm-1673948129693`, Dataset `Revenue`, Location `US`.
      Không có khoá này thì mục 2 và 3 không làm được.

---

## 2. Tầng dữ liệu đa nguồn

Sửa lại thiết kế: **không phải nguồn nào cũng copy về Postgres**.

| Nguồn | Cách lấy | Lý do |
| --- | --- | --- |
| Google Sheets | copy về `mart` (`npm run sync`) | Sheets không query được |
| BigQuery | **query trực tiếp** | Đã là kho phân tích; copy vừa phí vừa làm số cũ đi |
| Supabase / Postgres | query trực tiếp | Đã là Postgres |

- [x] Gộp thành một hàm query chung (`duLieu()` trong `src/lib/nguon.ts`),
      tự chọn đường theo `catalog.sources.type`
- [x] Đưa `doanh_thu_chi_tiet` vào danh mục dữ liệu (2,67 triệu dòng)
- [x] **Bỏ cache RAM**, chuyển sang `use cache` + `cacheLife` của Next 16.
      Đo được: 3,46s → 0,07s khi cache ấm
- [ ] Đặt lịch `npm run sync` bằng GitHub Actions (theo mẫu
      `.github/workflows/collect-schema.yml`). **Chưa chốt: mấy tiếng một lần?**

---

## 3. Khuôn dashboard

Mục tiêu: làm một cái cho chuẩn, sau cứ thế nhân bản.

- [ ] Nâng `/bang/doanh-thu` lên đủ mức của repo `doanh-thu-tu-doanh`:
  - [ ] Thanh lọc (khoảng ngày + nút nhanh Tuần/Tháng/Năm, lọc chọn-nhiều
        theo trạm / điểm trạm / bộ phận / nhóm hàng / cửa hàng)
  - [ ] Thẻ KPI có delta so tuần trước / tháng trước / cùng kỳ năm trước
  - [ ] Drill-down: bấm nhóm hàng → xem SKU
  - [ ] **Phần diễn giải bằng câu chữ** (Điểm sáng / Cảnh báo / Kiến nghị) —
        thứ khiến sếp đọc được dashboard mà không cần ai giải thích.
        Bên kia sinh bằng JS theo luật, không gọi LLM
  - [x] Streaming: bật `cacheComponents`, mỗi hàng một `<Suspense>` riêng
- [ ] Rút thành khuôn để dashboard sau chỉ việc sửa query và nhãn
- [ ] Viết lại dashboard doanh thu tự doanh trong app này để so trực tiếp
      với bản của nhân viên

Giữ bảng màu của app (đã kiểm định mù màu), học bố cục + phần diễn giải của họ.

---

## 4. Dọn phần cũ (đã chốt bỏ, chưa làm)

- [ ] Gỡ form ghép chart trong Quản trị: route `/admin/dashboard/[id]/charts`,
      `ChartForm.tsx`, `ChartSource.tsx`, `chart-actions.ts`, `query-actions.ts`
- [ ] Xoá bảng `catalog.charts` và `catalog.chart_queries`
- [ ] Thêm cột `route` vào `catalog.dashboards` để `/dashboards` trỏ thẳng vào
      trang nội bộ `/bang/<ten>` thay vì chỉ link ra tool ngoài
- [ ] Giữ nguyên thư viện chart và trang `/charts`

---

## 5. Trước khi lên production

- [ ] **Bỏ `AUTH_DISABLED` khỏi `.env.local`** và TUYỆT ĐỐI không khai biến này
      trên Vercel — có nó là mở toang cả `/admin` cho bất kỳ ai có link
- [ ] Nâng đăng nhập lên per-user. Hiện là một mật khẩu chung, mà
      `catalog.sources` chứa secret của mọi nguồn
- [ ] Đổi mật khẩu database Supabase (đã từng gõ vào cửa sổ chat) và cập nhật
      lại `DATABASE_URL` ở cả `.env.local` lẫn Vercel
- [ ] Ngừng phát triển app cũ `vrs-data-catalog` — nó dùng chung database nhưng
      chưa biết gì về lưu trữ, xoá dataset bên đó là mất luôn

---

## Đã xong

- Danh mục dataset + dashboard, mối nối hai chiều, sơ đồ lineage
- Lưu trữ & phục hồi khi xoá dataset/dashboard
- Thư viện 14 loại chart + bảng màu, trang tra cứu `/charts`
- Tầng `mart`: kéo 9 sheet (109k dòng) về Postgres, `npm run sync`
- Trang dashboard toàn màn hình `/bang/<ten>` + bản mẫu `/bang/doanh-thu`
- Nút thêm/sửa ngay trên các trang danh mục
