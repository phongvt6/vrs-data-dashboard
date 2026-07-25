"use client";

// Trang Hướng dẫn — bê nội dung 12 mục từ bản port (public/tu-doanh/huong-dan.html),
// trình bày native. Các công cụ phụ (prompt AI, ghi chú dùng chung, khai báo quầy)
// hiện còn ở bản gốc /bang/doanh-thu-tu-doanh-cu.

import type { ReactNode } from "react";

const SECTIONS: { id: string; num: number; ico: string; ten: string }[] = [
  { id: "gioi-thieu", num: 1, ico: "🎯", ten: "Giới thiệu" },
  { id: "giao-dien", num: 2, ico: "🧭", ten: "Tổng quan giao diện" },
  { id: "bo-loc", num: 3, ico: "🔎", ten: "Bộ lọc & so sánh" },
  { id: "tong-quan", num: 4, ico: "📊", ten: "Trang Tổng quan" },
  { id: "so-sanh", num: 5, ico: "📈", ten: "So sánh thời gian" },
  { id: "nhom-hang", num: 6, ico: "📦", ten: "Nhóm hàng" },
  { id: "danh-sach", num: 7, ico: "🗂️", ten: "Danh sách hàng hóa" },
  { id: "phan-tich", num: 8, ico: "🎯", ten: "Phân tích & kiến nghị" },
  { id: "quy-trinh", num: 9, ico: "🗓️", ten: "Quy trình hằng tuần" },
  { id: "thuat-ngu", num: 10, ico: "📖", ten: "Thuật ngữ" },
  { id: "faq", num: 11, ico: "❓", ten: "Câu hỏi thường gặp" },
];

export default function HuongDanView() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 24, alignItems: "start", maxWidth: 1000 }}>
      <nav style={{ position: "sticky", top: 16, display: "grid", gap: 2, fontSize: 13 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-soft)", marginBottom: 6 }}>Nội dung</div>
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} style={{ display: "flex", gap: 8, padding: "5px 8px", borderRadius: 7, color: "var(--ink)", textDecoration: "none" }}>
            <span style={{ color: "var(--ink-soft)", minWidth: 16 }}>{s.num}</span>{s.ten}
          </a>
        ))}
        <a href="/bang/doanh-thu-tu-doanh-cu" target="_blank" rel="noopener" style={{ marginTop: 8, fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>↗ Mở bản gốc</a>
      </nav>

      <div style={{ display: "grid", gap: 22, fontSize: 14, lineHeight: 1.6 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Hướng dẫn sử dụng</h2>
          <p style={{ margin: 0, color: "var(--ink-soft)" }}>
            Tài liệu giúp quản lý khối làm chủ toàn bộ dashboard phân tích doanh thu tự doanh — từ đọc số, lọc dữ liệu, đến phân tích chuyên sâu và ra quyết định. Đọc một lượt ~10 phút là dùng thành thạo.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {["📊 Dữ liệu trực tiếp từ BigQuery", "🔄 Cập nhật theo ngày", "🗂️ 4 trang phân tích"].map((c) => (
              <span key={c} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: "var(--accent-soft)", color: "var(--accent)", fontWeight: 600 }}>{c}</span>
            ))}
          </div>
        </div>

        <Sec id="gioi-thieu" ico="🎯" ten="1. Giới thiệu">
          <p className="lead">Dashboard <b>Doanh thu tự doanh</b> tổng hợp và phân tích doanh thu hàng hóa bán tại các điểm bán trong trạm (kiosk, siêu thị mini, nhà hàng) — giúp lãnh đạo & quản lý khối nắm nhanh tình hình và ra quyết định.</p>
          <Grid2>
            <FCard t="📈 Xem gì được?">Doanh thu theo thời gian, theo trạm/điểm trạm/bộ phận/cửa hàng, theo nhóm hàng & từng mã hàng (SKU), có so sánh với kỳ trước.</FCard>
            <FCard t="🗄️ Dữ liệu từ đâu?">Kết nối trực tiếp <b>BigQuery</b> (kho dữ liệu công ty), <b>cập nhật theo ngày</b>. Mọi con số là dữ liệu thật, không nhập tay.</FCard>
            <FCard t="🧭 Dùng để làm gì?">Theo dõi kết quả, phát hiện điểm bán/mặt hàng tăng–giảm bất thường, và nhận <b>kiến nghị hành động</b> để trình lãnh đạo.</FCard>
            <FCard t="🔐 Ai dùng được?">Quản lý khối và ban lãnh đạo. Chỉ cần mở link trên trình duyệt (máy tính hoặc điện thoại), không cần cài đặt.</FCard>
          </Grid2>
          <Call tone="tip">Số tiền hiển thị rút gọn: <b>tr</b> = triệu, <b>tỷ</b> = tỷ. Ví dụ <code>9,9 tỷ</code> = 9,9 tỷ đồng; <code>527,2 tr</code> = 527,2 triệu đồng.</Call>
        </Sec>

        <Sec id="giao-dien" ico="🧭" ten="2. Tổng quan giao diện">
          <p className="lead">Màn hình gồm 3 phần: <b>thanh bên trái</b> (chuyển trang), <b>thanh lọc phía trên</b> (chọn thời gian & bộ lọc), và <b>vùng nội dung</b> ở giữa.</p>
          <TableSimple head={["Trang", "Dùng khi bạn muốn…"]} rows={[
            ["📊 Tổng quan", "Nhìn bức tranh chung: tổng doanh thu, so sánh kỳ, cơ cấu theo trạm/nhóm, xếp hạng điểm bán."],
            ["📈 So sánh thời gian", "So sánh doanh thu giữa các đơn vị (trạm/điểm/bộ phận/cửa hàng) và theo dõi từng điểm trạm chi tiết."],
            ["📦 Nhóm hàng", "Phân tích theo nhóm hàng & mặt hàng: nhóm nào bán chạy, mã nào nên đẩy mạnh / nên bỏ."],
            ["🗂️ Danh sách hàng hóa", "Tra cứu chi tiết từng mã hàng, lọc theo trạm/điểm/bộ phận/cửa hàng."],
          ]} />
          <Call tone="tip">Nút <b>« Thu gọn</b> ở góc dưới thanh bên giúp thu nhỏ menu để có thêm chỗ xem biểu đồ.</Call>
          <h4>Thanh lọc phía trên</h4>
          <ul>
            <li><b>Khoảng ngày</b> — hai ô ngày Từ → Đến, kèm nút nhanh <b>Tuần này / Tháng.. / Năm..</b>.</li>
            <li><b>Bộ lọc</b> — Nhóm hàng, Trạm, Điểm trạm, Bộ phận, Cửa hàng (chọn nhiều, <b>liên thông</b> với nhau).</li>
            <li><b>↺ Đặt lại</b> — xóa mọi bộ lọc, về tháng hiện tại. <b>⟳ Cập nhật</b> — tải lại dữ liệu mới nhất.</li>
          </ul>
        </Sec>

        <Sec id="bo-loc" ico="🔎" ten="3. Bộ lọc & cách so sánh">
          <p className="lead">Phần quan trọng nhất — chọn đúng thời gian và bộ lọc thì mọi biểu đồ, bảng, phân tích bên dưới sẽ tự cập nhật theo.</p>
          <h4>Bộ lọc liên thông</h4>
          <p>Các bộ lọc tự lọc theo nhau: khi chọn một mục, các mục kia chỉ còn hiển thị giá trị thực sự có dữ liệu.</p>
          <Call tone="ok">Ví dụ: chọn Bộ phận <b>Nhà hàng</b> → danh sách Trạm tự rút gọn chỉ còn các trạm có nhà hàng. Nhờ vậy bạn không chọn nhầm tổ hợp không có dữ liệu.</Call>
          <h4>Chọn mốc so sánh</h4>
          <TableSimple head={["Mốc", "Ý nghĩa"]} rows={[
            ["vs tuần trước", "So với tuần liền trước."],
            ["vs tháng trước", "So với cùng số ngày của tháng liền trước."],
            ["vs cùng kỳ năm trước", "So với cùng khoảng thời gian năm ngoái."],
            ["Lũy kế năm", "Cộng dồn từ đầu năm đến nay."],
          ]} />
          <Call tone="tip"><b>So sánh công bằng:</b> nếu tháng này mới có dữ liệu đến ngày 12, hệ thống chỉ lấy ngày 1–12 của tháng trước để so, chứ không lấy cả tháng.</Call>
          <Call tone="amber">Khai báo <b>sáp nhập / đổi tên quầy</b> (để quy doanh thu lịch sử mã cũ về mã hiện tại) hiện thao tác ở <a href="/bang/doanh-thu-tu-doanh-cu" target="_blank" rel="noopener">bản gốc</a> qua nút ⚙️ Khai báo quầy — khai báo dùng chung cho cả hai bản.</Call>
        </Sec>

        <Sec id="tong-quan" ico="📊" ten="4. Trang Tổng quan">
          <p className="lead">Bức tranh tổng thể của kỳ đang chọn.</p>
          <ul>
            <li><b>Thẻ chỉ số (KPI)</b> — Doanh thu kỳ, mức tăng/giảm so các mốc, và sản lượng. <span style={{ color: "#006300", fontWeight: 700 }}>xanh = tăng</span>, <span style={{ color: "#d03b3b", fontWeight: 700 }}>đỏ = giảm</span>.</li>
            <li><b>✦ Phân tích nhanh</b> — tóm tắt tự động: kỳ này đạt bao nhiêu, tăng/giảm vì điểm bán nào.</li>
            <li><b>Doanh thu theo tháng</b> — cột năm nay so với đường năm trước.</li>
            <li><b>Cơ cấu theo Trạm / Điểm trạm / Nhóm hàng / Bộ phận</b> — biểu đồ tròn tỷ trọng.</li>
            <li><b>Doanh thu theo điểm bán</b> & <b>Chi tiết theo cửa hàng</b> — xếp hạng và bảng chi tiết.</li>
          </ul>
          <Call tone="tip">Cửa hàng có doanh thu = 0 được tự ẩn để bảng gọn.</Call>
        </Sec>

        <Sec id="so-sanh" ico="📈" ten="5. Trang So sánh thời gian">
          <p className="lead">So sánh doanh thu kỳ này với mốc trước cho từng đơn vị.</p>
          <ul>
            <li><b>Biểu đồ “So sánh doanh thu theo đơn vị”</b> — cột kỳ trước & kỳ này, kèm đường <b>% tăng/giảm</b>.</li>
            <li>Đổi cách xem bằng thanh <b>Theo trạm / điểm trạm / bộ phận / cửa hàng</b>.</li>
            <li>Phía dưới là <b>chi tiết từng điểm trạm</b>: doanh thu theo bộ phận và top 10 cửa hàng.</li>
          </ul>
        </Sec>

        <Sec id="nhom-hang" ico="📦" ten="6. Trang Nhóm hàng">
          <p className="lead">Phân tích sâu theo nhóm hàng và từng mặt hàng (SKU) — trang đắc lực nhất để quyết định phát triển hay cắt giảm hàng hóa.</p>
          <ul>
            <li><b>Cơ cấu nhóm hàng</b> (tròn) — Top nhóm lớn nhất, phần còn lại gộp “Nhóm khác”.</li>
            <li><b>Xếp hạng nhóm hàng</b> — bảng doanh thu, tỷ trọng, sản lượng, so mốc. <b>Bấm một nhóm</b> để xem chi tiết mã hàng.</li>
            <li><b>Doanh thu nhóm hàng theo tháng</b> — cột chồng 12 tháng gần nhất.</li>
          </ul>
          <Grid2>
            <FCard t="Top 80% doanh thu (Pareto)">Các mã <b>chủ lực</b> — số ít mã tạo ~80% doanh thu của nhóm. Cần tập trung bảo vệ & khai thác.</FCard>
            <FCard t="20% còn lại">Các mã <b>đuôi dài</b> — nhiều mã nhưng cộng lại chỉ ~20% doanh thu. Cần rà soát tinh gọn.</FCard>
          </Grid2>
          <Call tone="ok">Dưới 2 tab là gợi ý: <b>🚀 Nên phát triển</b> (mã đang tăng, đóng góp lớn) và <b>✂️ Cân nhắc bỏ/gộp</b> (mã doanh thu thấp / đang giảm).</Call>
        </Sec>

        <Sec id="danh-sach" ico="🗂️" ten="7. Trang Danh sách hàng hóa">
          <p className="lead">Tra cứu chi tiết mọi mã hàng, lọc linh hoạt.</p>
          <ul>
            <li><b>Bộ lọc Trạm / Điểm trạm / Bộ phận</b> (dạng ô bấm) — <b>liên thông</b>; mỗi mục có nút <b>ONLY</b> để chỉ xem một mục.</li>
            <li><b>Panel Danh sách cửa hàng</b> bên phải — có ô tìm nhanh; nút <b>Ẩn/Hiện</b> để mở rộng bảng.</li>
            <li><b>Ô tìm mã / tên hàng hóa</b> ngay trên bảng; bảng có dòng <b>tổng cộng</b> ở chân.</li>
          </ul>
        </Sec>

        <Sec id="phan-tich" ico="🎯" ten="8. Phân tích chuyên sâu & Kiến nghị">
          <p className="lead">Mỗi trang chính có khối phân tích — không chỉ hiển thị số mà đưa ra nhận định và việc cần làm (sinh bằng công thức cố định, luôn nhất quán).</p>
          <Grid2>
            <FCard t="📈 Điểm sáng">Đơn vị/nhóm đang tăng tốt, đầu kéo tăng trưởng.</FCard>
            <FCard t="⚠️ Cảnh báo & rủi ro">Đơn vị/nhóm giảm mạnh, rủi ro tập trung, cần rà soát.</FCard>
            <FCard t="✅ Kiến nghị hành động">Việc cụ thể nên làm, để trình lãnh đạo.</FCard>
            <FCard t="📌 Bối cảnh áp dụng">Ghi chú bối cảnh thực tế (ở bản gốc) được lồng vào phân tích.</FCard>
          </Grid2>
          <Call tone="tip">Ghi chú bối cảnh dùng chung + nút <b>Tạo prompt phân tích AI</b> / <b>Sao chép báo cáo</b> hiện có ở <a href="/bang/doanh-thu-tu-doanh-cu" target="_blank" rel="noopener">bản gốc</a>.</Call>
        </Sec>

        <Sec id="quy-trinh" ico="🗓️" ten="9. Quy trình đề xuất (hằng tuần)">
          <ol className="steps">
            <li><b>Xem Tổng quan</b> kỳ tuần/tháng — nắm doanh thu & mức tăng giảm so mốc.</li>
            <li><b>Đọc Phân tích chuyên sâu</b> — ghi nhận điểm sáng, cảnh báo.</li>
            <li>Vào <b>Nhóm hàng</b> — xét nhóm/mã <b>nên phát triển</b> và <b>nên bỏ/gộp</b>.</li>
            <li>Chốt <b>quyết định hành động</b> và trình lãnh đạo.</li>
          </ol>
        </Sec>

        <Sec id="thuat-ngu" ico="📖" ten="10. Thuật ngữ nhanh">
          <TableSimple head={["Thuật ngữ", "Nghĩa"]} rows={[
            ["Trạm", "Trạm dừng nghỉ (ví dụ V52 Hải Dương, V23 Hưng Yên)."],
            ["Điểm trạm", "Khu vực bán trong một trạm (ví dụ V52-SA1)."],
            ["Bộ phận", "Loại hình điểm bán: Kiosk, Siêu thị, Nhà hàng."],
            ["Cửa hàng (mã)", "Một điểm bán cụ thể, có mã riêng (ví dụ V52SA1S01)."],
            ["SKU / Mã hàng", "Một mặt hàng cụ thể."],
            ["Pareto (80/20)", "Số ít mã tạo phần lớn doanh thu — nhóm mã chủ lực cần tập trung."],
            ["Mốc so sánh", "Kỳ dùng để đối chiếu (tuần/tháng/năm trước, lũy kế năm)."],
          ]} />
        </Sec>

        <Sec id="faq" ico="❓" ten="11. Câu hỏi thường gặp">
          <Faq q="Dữ liệu cập nhật khi nào?">Lấy trực tiếp từ kho BigQuery của công ty, cập nhật theo ngày. Bấm ⟳ Cập nhật để tải bản mới nhất.</Faq>
          <Faq q="Vì sao lần đầu xem cả năm hơi lâu?">Kỳ dài phải quét nhiều dữ liệu hơn nên mất vài giây. Lần xem lại gần như tức thì (có bộ nhớ đệm ~10 phút).</Faq>
          <Faq q="Vì sao các trang cho con số hơi khác nhau?">Mỗi trang có phạm vi khác nhau (toàn công ty vs theo nhóm/cửa hàng) và phụ thuộc bộ lọc đang chọn. Luôn kiểm tra thanh lọc & mốc so sánh phía trên.</Faq>
          <Faq q="Phân tích do máy tính hay AI tạo ra?">Phần “Phân tích chuyên sâu” do hệ thống tính bằng công thức cố định (luôn chính xác & nhất quán), không dùng AI.</Faq>
          <Faq q="Xem trên điện thoại được không?">Được. Giao diện tự co theo màn hình; xem trên máy tính thoải mái hơn với bảng và biểu đồ lớn.</Faq>
        </Sec>

        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, color: "var(--ink-soft)", fontSize: 12.5 }}>
          Doanh thu tự doanh · VRS — Hướng dẫn sử dụng · <a href="/bang/doanh-thu-tu-doanh-cu" target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>Mở bản gốc ↗</a>
        </div>
      </div>
    </div>
  );
}

/* ---- primitive ---- */
function Sec({ id, ico, ten, children }: { id: string; ico: string; ten: string; children: ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 16 }}>
      <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px" }}>{ico} {ten}</h3>
      {children}
    </section>
  );
}
function Grid2({ children }: { children: ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "10px 0" }}>{children}</div>;
}
function FCard({ t, children }: { t: string; children: ReactNode }) {
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{t}</div>
      <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)" }}>{children}</p>
    </div>
  );
}
function Call({ tone, children }: { tone: "tip" | "ok" | "amber"; children: ReactNode }) {
  const c = tone === "ok" ? { bg: "rgba(0,131,0,0.06)", bd: "rgba(0,131,0,0.25)" } : tone === "amber" ? { bg: "rgba(180,130,20,0.08)", bd: "rgba(180,130,20,0.3)" } : { bg: "var(--accent-soft)", bd: "var(--line)" };
  return <div style={{ background: c.bg, border: `1px solid ${c.bd}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, margin: "10px 0" }}>{children}</div>;
}
function TableSimple({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: "auto", margin: "8px 0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr>{head.map((h, i) => <th key={i} style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--line)", fontSize: 12, color: "var(--ink-soft)" }}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ padding: "6px 8px", borderBottom: "1px solid var(--line)", verticalAlign: "top", fontWeight: j === 0 ? 600 : 400 }}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details style={{ borderBottom: "1px solid var(--line)", padding: "8px 0" }}>
      <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}>{q}</summary>
      <div style={{ marginTop: 6, fontSize: 13, color: "var(--ink-soft)" }}>{children}</div>
    </details>
  );
}
