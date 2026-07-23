import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const nextConfig: NextConfig = {
  // Thư viện Node nặng dùng phía server cho collector — không bundle.
  serverExternalPackages: ["pg", "@google-cloud/bigquery", "google-auth-library"],
  // Có nhiều lockfile (repo cha + app) — chỉ định root là thư mục app này.
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },
};

export default nextConfig;
