/* ⚙️ TỰ SINH từ src/chart/lib/theme.ts — chạy `node scripts/gen-kit.mjs`. Đừng sửa tay. */
(function () {
  var SERIES_LIGHT = ["#2a78d6","#eb6834","#1baf7a","#eda100","#e87ba4","#008300","#4a3aa7","#e34948"];
  var SERIES_DARK = ["#3987e5","#d95926","#199e70","#c98500","#d55181","#008300","#9085e9","#e66767"];
  var POS = "#e34948", NEG = "#2a78d6";
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
