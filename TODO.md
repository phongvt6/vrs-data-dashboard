# Việc còn lại

Cập nhật 2026-07-23. Xếp theo thứ tự nên làm.

---

## 0b. Hệ thiết kế dùng chung — làm mẫu với 2 dashboard (xong bước 1)

Chốt hướng: **mẫu để nhân rộng = native** (`/bang/doanh-thu`, dùng `src/chart/`
+ `dien-giai.ts`). 2 bản port giữ giao diện gốc nhưng **đồng bộ token** với hệ
thiết kế app.

- [x] Kit dùng chung `public/_kit/` sinh từ `theme.ts` (`npm run kit`, tự chạy ở
      `prebuild`) — một nguồn sự thật về màu + định dạng số cho cả native lẫn port.
- [x] Áp vào **khoán** + **tự doanh**: bảng màu categorical → palette mù-màu 8 slot
      dùng chung; số → `KIT.vnCompact` (tỷ/tr/k). Verify cả hai render đúng.
- [ ] **Nhân rộng:** dashboard mới xây native theo khuôn `/bang/doanh-thu`. Cân
      nhắc dựng lại 2 port thành native để đồng bộ HẲN (không chỉ token) — khoán
      đã có bản native trong git history.
- [ ] Kit mới đồng bộ *token* (màu/số), chưa đụng *layout/chrome* (sidebar tối của
      khoán vs sáng của tự doanh vẫn khác). Nếu muốn đồng bộ cả chrome → phải
      thống nhất khung, gần như dựng lại native.

---

## 0. Dashboard Thưởng khoán — vừa thêm (nhánh riêng, cần xác nhận)

Port **nguyên xi** tool thưởng khoán (Cloudflare Worker `worker.js`) thành
dashboard `/bang/thuong-khoan`. Cùng cách làm với dashboard doanh thu tự doanh:
front-end tĩnh + rewrite + API route, giữ giao diện y hệt app nhân viên.

- [x] Front-end bê nguyên vào `public/khoan/index.html` (10 trang: Dashboard,
      Báo cáo, Bảng thi đua, Bảng tính thưởng, Kiosk, Siêu thị, Tra cứu giờ làm,
      Kiểm tra, Danh sách data, Hướng dẫn). Rewrite `/bang/thuong-khoan` →
      `/khoan/index.html` trong `next.config.ts`.
- [x] `/api/khoan/data` trả JSON đúng shape `/api/data` của worker, đọc từ
      `mart.khoan_*` (không cần service account lúc chạy). **Engine chia thưởng
      vẫn chạy ở client** — đúng một engine, không có bản sao server để lệch.
- [x] Nguồn **`sheets_pub`** — đọc Google Sheet bản *Publish to web*, không cần
      service account (tool gốc đọc đúng đường này). Thêm vào collector, form
      Quản trị, và `npm run sync`. Khai tab dạng `gid|tên`.
- [x] Sửa lỗi đọc số kiểu Mỹ trong `scripts/lib/mart.mjs`: `"280,000,000"`
      trước bị đọc thành 280 (giả định chấm-ngăn-nghìn kiểu VN). Nay suy quy ước
      từ chính chuỗi. **Ảnh hưởng ngược:** ô `"1,234"` trước hiểu 1.234, nay
      1234 — nếu có sheet dùng phẩy thập phân đúng 3 chữ số cần soi lại.
- [x] 5 dataset khoán vào danh mục + nối dashboard; số thật ở `mart.khoan_*`.
- [ ] **Đối chiếu số `/bang/thuong-khoan` với tool Worker gốc.** Đối soát nội bộ
      khớp tuyệt đối (chênh 0 đ / 1,16 tỷ quỹ), verify 3 trang phức tạp nhất
      (Dashboard, Kiểm tra, Bảng thi đua) render đúng. Nhưng chưa ai so từng số
      với bản của nhân viên. So một kỳ là đủ yên tâm.
- [ ] **Mốc KPI tháng 7 đang là 5.000.000.000 cho MỌI quầy** trong sheet cơ chế
      (tháng 4 thì 280tr–3 tỷ tuỳ quầy) — nhìn như số placeholder. Nếu đúng thì
      % hoàn thành KPI tháng 7 vô nghĩa; cần team kinh doanh chốt mốc thật.
- [ ] **Lỗ hổng có sẵn trong engine gốc** (nay chạy ở client, trong
      `public/khoan/index.html`): ngày-quầy có người khai giờ nhưng tất cả hệ số
      0 → quỹ tính "đang chia" mà không ai nhận; đối soát báo lệch nhưng không
      nói vì sao. Chưa xảy ra trên dữ liệu thật. Cách chữa: xếp quỹ ngày-quầy có
      tổng điểm 0 vào quỹ treo. Sửa thì báo lại nhân viên để họ đồng bộ bản gốc.
- [ ] Gom khai báo **sáp nhập/đổi tên quầy** dùng chung với dashboard tự doanh
      (`catalog.kv` storemap:v1) — hiện khoán đọc từ sheet `khoan_sap_nhap`
      riêng, tự doanh đọc từ `kv`. Hai chỗ, nên một.

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

- [x] Bản tham chiếu đầy đủ ở `/bang/tu-doanh` (BigQuery):
  - [x] Thanh lọc trên URL: khoảng ngày + nút nhanh, lọc chọn-nhiều theo
        trạm / điểm trạm / bộ phận / nhóm hàng / quầy
  - [x] Thẻ KPI 2 mốc so sánh (kỳ trước liền kề · cùng kỳ năm trước)
  - [x] Drill-down: bấm nhóm hàng → bảng SKU, giữ nguyên bộ lọc
  - [x] Diễn giải Điểm sáng / Cảnh báo / Kiến nghị (sinh bằng luật, không LLM)
  - [x] Streaming: mỗi hàng một `<Suspense>` riêng
- [x] Khuôn = các component tái dùng: `ThanhLoc`, `TheKPI`, `KhoiDienGiai`,
      `BangKhung`/`Luoi`/`O` + helper `loc.ts`, `dien-giai.ts`, `nguon.ts`.
      Dashboard sau chỉ đổi query + nhãn, không viết lại logic.

Giữ bảng màu của app (đã kiểm định mù màu), học bố cục + phần diễn giải của họ.

**Còn có thể làm sau:** nâng `/bang/doanh-thu` (nguồn Sheets) lên cùng mức, và
để người dùng chọn nhóm cũ vs nhóm mới sau khi chốt cách xử lý dữ liệu nhóm hàng.

---

## 4. Dọn phần cũ — XONG

- [x] Gỡ form ghép chart (routes /admin/dashboard/[id]/charts, ChartForm,
      ChartSource, chart-actions, query-actions, lib/chart-data, DashboardGrid)
- [x] Xoá bảng `catalog.charts` + `catalog.chart_queries` (sao lưu vào archive
      trước bằng `npm run db:drop-charts`)
- [x] Thêm cột `route` vào `catalog.dashboards`; danh mục trỏ thẳng vào
      `/bang/<route>` khi có, nhãn "Trong app" trên card
- [x] Giữ nguyên thư viện chart và trang `/charts`

Việc của bạn: vào Sửa từng dashboard, điền `route` (vd `tu-doanh`) để card
"Doanh thu tự doanh" mở thẳng trang trong app.

---

## 5. Trước khi lên production

- [ ] **Bỏ `AUTH_DISABLED` khỏi `.env.local`** và TUYỆT ĐỐI không khai biến này
      trên Vercel — có nó là mở toang cả `/admin` cho bất kỳ ai có link
- [ ] Nâng đăng nhập lên per-user. Hiện là một mật khẩu chung, mà
      `catalog.sources` chứa secret của mọi nguồn
- [ ] Đổi mật khẩu database Supabase (đã từng gõ vào cửa sổ chat) và cập nhật
      lại `DATABASE_URL` ở cả `.env.local` lẫn Vercel
- [~] App cũ `vrs-data-catalog`: đã ĐÓNG BĂNG + vá lỗ hổng xoá.
      Commit 4eccae6 (chưa push): archive-trước-khi-xoá dùng chung catalog.archive,
      README/AGENTS đánh dấu deprecated. **Chưa push** vì push = deploy live lên
      công cụ team đang dùng — chờ bạn quyết. Tắt hẳn app cũ để SAU KHI app mới
      lên production và team chuyển sang.

---

## Đã xong

- Danh mục dataset + dashboard, mối nối hai chiều, sơ đồ lineage
- Lưu trữ & phục hồi khi xoá dataset/dashboard
- Thư viện 14 loại chart + bảng màu, trang tra cứu `/charts`
- Tầng `mart`: kéo 9 sheet (109k dòng) về Postgres, `npm run sync`
- Trang dashboard toàn màn hình `/bang/<ten>` + bản mẫu `/bang/doanh-thu`
- Nút thêm/sửa ngay trên các trang danh mục
