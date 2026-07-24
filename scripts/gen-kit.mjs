#!/usr/bin/env node
// Sinh bộ "kit" token dùng chung cho các dashboard front-end TĨNH (public/khoan,
// public/tu-doanh) từ ĐÚNG bảng màu của thư viện chart React (src/chart/lib/theme.ts).
//
//   node scripts/gen-kit.mjs
//
// Vì sao: dashboard native (/bang/doanh-thu) import thẳng theme.ts; các bản port
// tĩnh không import TS được. Kit này là bản phát sinh của CÙNG bảng màu, để hai
// loại dashboard đọc chung một nguồn — sửa màu ở theme.ts, chạy lại script, cả
// hai bên đổi theo. KHÔNG sửa tay file trong public/_kit.
//
// Kit chỉ đồng bộ TOKEN (màu + định dạng số), không đụng layout của từng app.

import fs from "node:fs/promises";
import { SERIES, DIVERGING, STATUS } from "../src/chart/lib/theme.ts";

const OUT = "public/_kit";
await fs.mkdir(OUT, { recursive: true });

const varLines = (arr, prefix) =>
  arr.map((c, i) => `  --${prefix}-${i + 1}: ${c};`).join("\n");

const css = `/* ⚙️ TỰ SINH từ src/chart/lib/theme.ts — chạy \`node scripts/gen-kit.mjs\`.
   Đừng sửa tay. Bảng màu categorical đã kiểm định mù màu (light + dark). */
:root {
${varLines(SERIES.light, "kit-series")}
  --kit-pos: ${DIVERGING.light.pos};
  --kit-neg: ${DIVERGING.light.neg};
  --kit-good: ${STATUS.good};
  --kit-warning: ${STATUS.warning};
  --kit-critical: ${STATUS.critical};
}
@media (prefers-color-scheme: dark) {
  :root {
${varLines(SERIES.dark, "kit-series")}
    --kit-pos: ${DIVERGING.dark.pos};
    --kit-neg: ${DIVERGING.dark.neg};
  }
}
`;

// palette.js: dữ liệu màu lấy từ theme.ts (nguồn sự thật); phần định dạng số là
// bản sao gọn của vnCompact/vnNumber/vnPercent (logic ổn định, chú thích rõ).
const js = `/* ⚙️ TỰ SINH từ src/chart/lib/theme.ts — chạy \`node scripts/gen-kit.mjs\`. Đừng sửa tay. */
(function () {
  var SERIES_LIGHT = ${JSON.stringify(SERIES.light)};
  var SERIES_DARK = ${JSON.stringify(SERIES.dark)};
  var POS = ${JSON.stringify(DIVERGING.light.pos)}, NEG = ${JSON.stringify(DIVERGING.light.neg)};
  var dark = matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  var SERIES = dark ? SERIES_DARK : SERIES_LIGHT;

  // Số kiểu VN — bản sao của vnCompact/vnNumber/vnPercent trong theme.ts.
  function trim(n, d) {
    return n.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: d }).replace(/,0+$/, "");
  }
  function vnCompact(n, d) {
    d = d == null ? 1 : d;
    var a = Math.abs(n), s = n < 0 ? "-" : "";
    if (a >= 1e12) return s + trim(a / 1e12, d) + " nghìn tỷ";
    if (a >= 1e9) return s + trim(a / 1e9, d) + " tỷ";
    if (a >= 1e6) return s + trim(a / 1e6, d) + " tr";
    if (a >= 1e3) return s + trim(a / 1e3, d) + " k";
    return s + trim(a, 0);
  }
  function vnNumber(n, d) { return Number(n || 0).toLocaleString("vi-VN", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function vnPercent(n, d) { return trim(n, d == null ? 1 : d) + "%"; }

  // Màu theo THỰC THỂ: cùng một tên (Kiosk, Siêu thị, một nhóm hàng…) luôn ra
  // cùng màu trong mọi chart — bám khoá thay vì thứ tự.
  function colorFor(key) {
    var s = String(key == null ? "" : key), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return SERIES[h % SERIES.length];
  }

  window.KIT = {
    series: SERIES, seriesLight: SERIES_LIGHT, seriesDark: SERIES_DARK,
    pos: POS, neg: NEG, dark: dark,
    colorFor: colorFor, vnCompact: vnCompact, vnNumber: vnNumber, vnPercent: vnPercent,
  };
})();
`;

await fs.writeFile(`${OUT}/theme.css`, css);
await fs.writeFile(`${OUT}/palette.js`, js);
console.log(`✓ ${OUT}/theme.css (${SERIES.light.length} màu series)`);
console.log(`✓ ${OUT}/palette.js (window.KIT: series, colorFor, vnCompact…)`);
