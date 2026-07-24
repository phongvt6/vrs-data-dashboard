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
};

export default nextConfig;
