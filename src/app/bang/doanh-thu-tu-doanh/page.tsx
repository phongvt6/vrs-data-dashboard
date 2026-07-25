// Dashboard "Doanh thu tự doanh" — bản NATIVE (React + ECharts + theme app).
//
// Trang chỉ là shell tĩnh render app client <TuDoanhApp/>; app tự fetch dữ liệu
// từ /api/tu-doanh/* (đúng API bản port dùng → số khớp tuyệt đối). Không đọc DB
// phía server ở trang này nên KHÔNG cần connection() và không dính build-time DB.
//
// Bản port gốc của team kinh doanh giữ song song ở /bang/doanh-thu-tu-doanh-cu
// (rewrite → public/tu-doanh/, xem next.config.ts).

import TuDoanhApp from "./TuDoanhApp";

export const metadata = { title: "Doanh thu tự doanh — VRS" };

export default function DoanhThuTuDoanhPage() {
  return <TuDoanhApp />;
}
