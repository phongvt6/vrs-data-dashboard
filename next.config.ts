import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const nextConfig: NextConfig = {
  // Bật `use cache` + streaming (PPR). Nhờ nó cache nằm ở tầng dữ liệu dùng
  // chung thay vì RAM từng instance, và phần nhẹ của trang hiện ngay trong khi
  // query nặng còn đang chạy.
  cacheComponents: true,
  // Thư viện Node nặng dùng phía server cho collector — không bundle.
  serverExternalPackages: ["pg", "@google-cloud/bigquery", "google-auth-library"],
  // Có nhiều lockfile (repo cha + app) — chỉ định root là thư mục app này.
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },
  // Dashboard "Doanh thu tự doanh" là app front-end tĩnh (bê nguyên từ app nhân
  // viên, xem public/tu-doanh/). Giữ URL sạch /bang/doanh-thu-tu-doanh nhưng phục
  // vụ file tĩnh — không đi qua cây React của /bang (nó tự có chrome riêng).
  async rewrites() {
    return [
      { source: "/bang/doanh-thu-tu-doanh", destination: "/tu-doanh/index.html" },
      // Bản GỐC "Thưởng khoán" của team kinh doanh — app front-end tĩnh (port từ
      // tool Cloudflare Worker, xem public/khoan/). Số lấy từ /api/khoan/data
      // (đọc mart.khoan_*), engine tính thưởng chạy ở client. Giữ song song ở
      // /bang/thuong-khoan-cu; route sạch /bang/thuong-khoan nay là bản NATIVE
      // (trang React ở src/app/bang/thuong-khoan/ — filesystem thắng rewrite).
      { source: "/bang/thuong-khoan-cu", destination: "/khoan/index.html" },
    ];
  },
};

export default nextConfig;
