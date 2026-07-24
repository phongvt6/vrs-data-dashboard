#!/usr/bin/env node
// Khai báo nguồn "Sheet thưởng khoán" + dashboard Thưởng khoán vào catalog.
//
//   node --env-file-if-exists=.env.local scripts/seed-khoan.mjs
//
// Chạy lại được nhiều lần (upsert). Sau khi chạy:
//   1. Quản trị → Nguồn dữ liệu → "Đồng bộ" nguồn này để sinh 5 dataset
//      (hoặc chờ lịch), rồi
//   2. npm run sync  — kéo số thật về schema mart.
//
// Vì sao nguồn này là loại sheets_pub: tool thưởng khoán của nhân viên đọc sheet
// qua link "Publish to web", không qua Sheets API. Ta nối vào ĐÚNG đường đó để
// hai bên luôn nhìn cùng một con số, và để không phải xin thêm service account.

import pg from "pg";

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("Thiếu DATABASE_URL. Xem .env.example.");
  process.exit(1);
}

const SOURCE_ID = "src_khoan_pub";
const PUB_ID =
  "2PACX-1vTji6Mnqcbo_dC9kZcs02ZNR_G0wqi-ae7kzAEdr1Qjne_i1Zb_kq3dL7kvSn3ycysnQYT80K6yk3nt";

// gid lấy từ chính worker (const GIDS). Tên tab đặt theo tên bảng trong worker
// để đọc catalog là biết ngay bảng nào nuôi phần nào.
const TABS = [
  { gid: "0", title: "khoan_nhan_vien" },
  { gid: "990984773", title: "khoan_co_che_thuong" },
  { gid: "79634772", title: "khoan_doanh_thu" },
  { gid: "376657892", title: "khoan_gio_lam" },
  { gid: "2115327886", title: "khoan_sap_nhap" },
];

const DASHBOARD_ID = "db_thuong_khoan";

// Mô tả từng dataset — collector chỉ lấy được tên cột, phần "để làm gì" là tri
// thức nghiệp vụ, phải viết tay. Đây chính là giá trị của cuốn danh mục.
const MO_TA = {
  khoan_nhan_vien:
    "Danh mục nhân sự theo tháng: mã NV, chức vụ, hệ số KPI, quầy đang làm. " +
    "Hệ số KPI ở đây nhân với giờ làm ra ĐIỂM — mẫu số chia quỹ thưởng. " +
    "Thiếu một dòng ở đây thì nhân viên đó hệ số 0, thưởng 0.",
  khoan_co_che_thuong:
    "Chính sách khoán theo (quầy × tháng): mốc doanh thu KPI, tỷ lệ trích dưới mốc " +
    "và vượt mốc. Quầy có doanh thu mà thiếu dòng ở đây thì quỹ thưởng = 0.",
  khoan_doanh_thu:
    "Doanh thu theo ngày × quầy. Nguồn duy nhất có ngày thật, nên cũng là nơi suy ra " +
    "năm cho các bảng chỉ ghi tháng. Luỹ kế trong tháng so với mốc KPI quyết định " +
    "phần doanh thu nào được trích theo tỷ lệ vượt mốc.",
  khoan_gio_lam:
    "Khai báo giờ làm theo ngày × nhân viên × quầy. Nhân với hệ số KPI ra điểm.",
  khoan_sap_nhap:
    "Khai báo quầy cũ sáp nhập vào quầy mới từ ngày nào. Quầy tiếp nhận thừa hưởng " +
    "doanh thu luỹ kế của quầy cũ để tính mốc KPI chung; quầy cũ vẫn giữ quỹ thưởng " +
    "của những ngày nó còn hoạt động.",
};

const client = new pg.Client({
  connectionString,
  ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(
    `INSERT INTO catalog.sources (id, type, label, nguon, enabled, config, secret)
     VALUES ($1, 'sheets_pub', $2, 'Google Sheets', true, $3, '')
     ON CONFLICT (id) DO UPDATE SET
       type='sheets_pub', label=$2, nguon='Google Sheets', enabled=true, config=$3`,
    [SOURCE_ID, "Sheet thưởng khoán (bản publish)", JSON.stringify({ pubId: PUB_ID, tabs: TABS })]
  );
  console.log(`nguồn ${SOURCE_ID} — ${TABS.length} tab đã khai`);

  // route = tên trang dưới /bang/. Danh mục trỏ thẳng vào /bang/thuong-khoan
  // (cột `route`, thêm ở migration 004) thay vì link ra công cụ ngoài.
  await client.query(
    `INSERT INTO catalog.dashboards
       (id, ten, mo_ta, cong_cu, route, chu_so_huu, phong_ban, doi_tuong, tan_suat,
        phan_loai_bao_mat, trang_thai)
     VALUES ($1, $2, $3, 'Nội bộ', 'thuong-khoan', '', 'Điều hành kinh doanh',
             'BGĐ, quản lý vùng, trưởng quầy', 'Hằng ngày', 'Nội bộ', 'prototype')
     ON CONFLICT (id) DO UPDATE SET
       ten=$2, mo_ta=$3, cong_cu='Nội bộ', route='thuong-khoan', url='', updated_at=now()`,
    [
      DASHBOARD_ID,
      "Thưởng khoán",
      "Bê nguyên tool thưởng khoán của team kinh doanh (Cloudflare Worker) vào " +
        "app: giao diện giữ y hệt, số lấy từ mart.khoan_* qua /api/khoan/data. " +
        "Quỹ thưởng sinh từ doanh thu theo mốc KPI của từng quầy, chia cho nhân " +
        "viên theo giờ làm × hệ số.",
    ]
  );
  console.log(`dashboard ${DASHBOARD_ID}`);

  // Mô tả + mối nối dashboard ↔ dataset chỉ gắn được cho dataset đã tồn tại;
  // lần chạy đầu (trước khi đồng bộ nguồn) sẽ chưa có gì, chạy lại sau là đủ.
  let noi = 0;
  for (const t of TABS) {
    const { rowCount } = await client.query(
      `UPDATE catalog.datasets SET mo_ta = $2, chu_so_huu = 'Team kinh doanh',
              tan_suat = 'Hằng ngày', updated_at = now()
        WHERE id = $1 AND mo_ta = ''`,
      [t.title, MO_TA[t.title] ?? ""]
    );
    if (rowCount) console.log(`  mô tả → ${t.title}`);

    const r = await client.query(
      `INSERT INTO catalog.dashboard_datasets (dashboard_id, dataset_id, vai_tro)
       SELECT $1, id, 'nguồn chính' FROM catalog.datasets WHERE id = $2
       ON CONFLICT DO NOTHING`,
      [DASHBOARD_ID, t.title]
    );
    noi += r.rowCount ?? 0;
  }
  console.log(
    noi
      ? `${noi} mối nối dashboard ↔ dataset`
      : "chưa nối được dataset nào — đồng bộ nguồn trước rồi chạy lại script này"
  );
} finally {
  await client.end();
}
