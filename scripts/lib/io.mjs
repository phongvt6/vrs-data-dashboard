// Tiện ích đọc/ghi catalog.json + helper. Node thuần, không phụ thuộc gì.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
export const CATALOG_PATH = resolve(here, "../../src/data/catalog.json");

export async function readCatalog(path = CATALOG_PATH) {
  const txt = await readFile(path, "utf8");
  const cat = JSON.parse(txt);
  cat.datasets ??= [];
  cat.relationships ??= [];
  return cat;
}

export async function writeCatalog(catalog, path = CATALOG_PATH) {
  // Giữ format 2-space + newline cuối cho git diff sạch.
  await writeFile(path, JSON.stringify(catalog, null, 2) + "\n", "utf8");
}

// Dấu thanh tổ hợp (U+0300–U+036F) còn lại sau khi normalize NFD.
const COMBINING = new RegExp("[\\u0300-\\u036f]", "g");

// "TỔNG_HỢP (2024)" -> "tong_hop_2024"; đảm bảo không trùng với used.
export function slugify(name, used = new Set()) {
  const base =
    String(name)
      .normalize("NFD")
      .replace(COMBINING, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "dataset";
  let id = base;
  let n = 2;
  while (used.has(id)) id = `${base}_${n++}`;
  return id;
}

// Đọc biến môi trường, hỗ trợ giá trị dạng "env:TEN_BIEN" trong config.
export function resolveEnv(value) {
  if (typeof value === "string" && value.startsWith("env:")) {
    return process.env[value.slice(4)];
  }
  return value;
}
