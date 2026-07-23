// Thư viện chart của app dashboard.
//
// Taxonomy + phần hướng dẫn (nên dùng / tránh) bê từ app `ui-chart-catalog`.
// Khác biệt quan trọng: bên đó mỗi chart là một demo viết tay với số liệu cứng,
// dùng để TRA CỨU. Ở đây chart phải NHẬN dữ liệu, nên mọi loại chart cùng ăn
// chung một dạng đầu vào duy nhất là ChartRow[] — xem chú thích bên dưới.
//
// File thuần, không đụng DB — an toàn để import ở client.

/**
 * Một dòng dữ liệu cho chart. Mọi loại chart đều đọc dạng này; ý nghĩa từng
 * trường thay đổi theo loại (cột "dùng gì" trong CHART_TYPES nói rõ):
 *
 *   cột/thanh/donut/phễu   label = tên hạng mục, value = giá trị
 *   cột nhóm/cột chồng     label = nhóm, series = thành phần, value = giá trị
 *   đường/miền             label = mốc thời gian, series = tên đường
 *   heatmap                label = trục ngang, series = trục dọc, value = độ đậm
 *   scatter                label = tên điểm, value = x, value2 = y
 *   ô chỉ số / meter        value = số hiện tại, value2 = kỳ trước (hoặc mốc trần)
 */
export type ChartRow = {
  label: string;
  series?: string;
  value: number;
  value2?: number;
};

/** Tuỳ chọn hiển thị của một chart cụ thể, lưu trong cột `config` (jsonb). */
export type ChartConfig = {
  /** Định dạng con số trên trục và tooltip. */
  dinh_dang?: "so" | "tien" | "phan_tram";
  /** Mốc trần cho meter, hoặc đường mục tiêu cho cột/đường. */
  muc_tieu?: number;
  /** Đơn vị hiện cạnh con số ở ô chỉ số. */
  don_vi?: string;
};

export type JobId =
  | "single-value"
  | "compare"
  | "composition"
  | "trend"
  | "distribution"
  | "correlation"
  | "flow"
  | "pattern";

export type Job = {
  id: JobId;
  ten: string;
  /** Câu hỏi nghiệp vụ mà nhóm này trả lời. */
  cau_hoi: string;
};

// Phân loại theo MỤC ĐÍCH PHÂN TÍCH, không theo tên biểu đồ: người đi tìm không
// nghĩ "tôi cần treemap", họ nghĩ "tôi cần so sánh cơ cấu".
export const JOBS: Job[] = [
  { id: "single-value", ten: "Một con số", cau_hoi: "Hôm nay con số đó là bao nhiêu, hơn kém kỳ trước thế nào?" },
  { id: "compare", ten: "So sánh", cau_hoi: "Ai nhiều hơn ai, hơn bao nhiêu?" },
  { id: "composition", ten: "Cơ cấu", cau_hoi: "Cái tổng đó gồm những phần nào, mỗi phần chiếm bao nhiêu?" },
  { id: "trend", ten: "Xu hướng", cau_hoi: "Đang tăng hay giảm, từ lúc nào?" },
  { id: "flow", ten: "Luồng & biến động", cau_hoi: "Từ đâu chảy đến đâu, cộng trừ những gì ra số cuối?" },
  { id: "pattern", ten: "Quy luật theo lưới", cau_hoi: "Cao điểm rơi vào khung giờ nào, ngày nào?" },
  { id: "correlation", ten: "Tương quan", cau_hoi: "X tăng thì Y có tăng theo không?" },
  { id: "distribution", ten: "Phân bố", cau_hoi: "Dữ liệu trải ra sao, đâu là giá trị bất thường?" },
];

export type ChartType = {
  id: string;
  ten: string;
  job: JobId;
  mo_ta: string;
  /** Khi nào NÊN dùng. */
  nen_dung: string[];
  /** Khi nào KHÔNG dùng — phần quan trọng nhất của một mục. */
  tranh: string[];
  /** Dữ liệu đầu vào phải có dạng gì. */
  dang_du_lieu: string;
  /** Chiều cao mặc định của ô chart trong lưới dashboard. */
  cao?: number;
};

// 14 loại đang render được. Phần hướng dẫn giữ nguyên tinh thần bản gốc ở
// `ui-chart-catalog` — chỗ nào bảo "cấm" thì thật sự là cấm.
export const CHART_TYPES: ChartType[] = [
  {
    id: "stat-tile",
    ten: "Ô chỉ số (KPI)",
    job: "single-value",
    mo_ta: "Một con số to, kèm mức chênh so với kỳ trước.",
    nen_dung: [
      "Người xem chỉ cần biết “hôm nay bao nhiêu, hơn kém kỳ trước thế nào”.",
      "Đặt ở đầu dashboard, trước khi vào các biểu đồ chi tiết.",
    ],
    tranh: [
      "Hơn 5–6 chỉ số → thành bức tường số, không ai đọc. Cắt còn 3–5 cái thật sự dẫn dắt quyết định.",
      "Đừng thay một ô chỉ số bằng biểu đồ cột có đúng một cột — lãng phí không gian.",
    ],
    dang_du_lieu: "Một dòng: value = số hiện tại, value2 = kỳ trước (để tính chênh).",
    cao: 1,
  },
  {
    id: "meter",
    ten: "Thanh tiến độ",
    job: "single-value",
    mo_ta: "Thanh ngang cho biết đã đi được bao nhiêu phần của mốc trần.",
    nen_dung: [
      "Có một mốc trần rõ ràng: chỉ tiêu tháng, dung lượng kho, % hoàn thành.",
      "Người xem chỉ cần biết “đã tới đâu so với đích”.",
    ],
    tranh: [
      "Không có trần tự nhiên → tỷ lệ so với cái gì? Dùng ô chỉ số.",
      "Đừng dùng gauge hình bán nguyệt (kim đồng hồ): tốn gấp 3 diện tích để chở đúng một con số.",
    ],
    dang_du_lieu: "Một dòng: value = thực hiện, value2 (hoặc config.muc_tieu) = trần.",
    cao: 1,
  },
  {
    id: "line",
    ten: "Biểu đồ đường",
    job: "trend",
    mo_ta: "Một hoặc vài đường theo trục thời gian.",
    nen_dung: [
      "Trục hoành là thời gian liên tục, khoảng cách đều nhau.",
      "Từ ~8 điểm trở lên (ít hơn thì cột đọc rõ hơn).",
      "Cần so sánh hình dạng giữa 2–4 đối tượng.",
    ],
    tranh: [
      "Trục hoành là danh mục rời rạc (tên chi nhánh, tên sản phẩm) — nối chúng bằng đường là bịa ra một sự liên tục không có thật.",
      "Quá 4–5 đường hội tụ vào nhau → nhãn cuối dính chùm; tách nhiều chart nhỏ.",
      "Dữ liệu có lỗ hổng → để đứt đoạn, đừng nối thẳng qua chỗ thiếu.",
    ],
    dang_du_lieu: "label = mốc thời gian, series = tên đường, value = giá trị.",
  },
  {
    id: "area",
    ten: "Biểu đồ miền",
    job: "trend",
    mo_ta: "Một đường có tô nền nhạt bên dưới để nhấn cảm giác khối lượng.",
    nen_dung: [
      "MỘT series duy nhất, muốn nhấn cảm giác khối lượng.",
      "Trục giá trị bắt đầu từ 0 — bắt buộc, phần tô vô nghĩa nếu cắt gốc.",
    ],
    tranh: [
      "Nhiều series chồng lấn → miền này che miền kia. Dùng đường thường.",
      "Giá trị là tỷ lệ, chỉ số, nhiệt độ — những thứ không “cộng dồn” được thì phần tô nói dối.",
    ],
    dang_du_lieu: "label = mốc thời gian, value = giá trị không âm.",
  },
  {
    id: "column",
    ten: "Biểu đồ cột",
    job: "compare",
    mo_ta: "Cột đứng so sánh vài hạng mục tên ngắn.",
    nen_dung: [
      "So sánh 3–12 hạng mục có tên ngắn.",
      "Thứ tự hạng mục tự nhiên (thời gian) hoặc sắp xếp theo giá trị.",
    ],
    tranh: [
      "Tên hạng mục dài → phải xoay nhãn 45° là dấu hiệu nên dùng thanh ngang.",
      "Hơn ~12 hạng mục → thanh ngang hoặc bảng.",
      "KHÔNG BAO GIỜ cắt gốc trục để “nhìn cho rõ chênh lệch”.",
    ],
    dang_du_lieu: "label = hạng mục, value = giá trị. Mỗi hạng mục đúng một dòng.",
  },
  {
    id: "bar",
    ten: "Thanh ngang",
    job: "compare",
    mo_ta: "Thanh nằm ngang, hợp với tên dài và bảng xếp hạng.",
    nen_dung: [
      "Tên hạng mục dài (tên chi nhánh, tên sản phẩm).",
      "Bảng xếp hạng — sắp xếp giảm dần, top-N.",
      "Nhiều hạng mục (10–25) — cuộn dọc tự nhiên hơn cuộn ngang.",
    ],
    tranh: [
      "Trục là thời gian → thời gian phải chạy ngang, dùng cột đứng hoặc đường.",
      "Chỉ có 2–3 hạng mục tên ngắn → cột đứng gọn hơn.",
    ],
    dang_du_lieu: "Giống cột đứng: label = hạng mục, value = giá trị.",
  },
  {
    id: "grouped-bar",
    ten: "Cột nhóm",
    job: "compare",
    mo_ta: "Nhiều series đứng cạnh nhau trong từng nhóm.",
    nen_dung: [
      "2–3 series, 3–8 nhóm. Vượt mức đó là rừng cột.",
      "Cần so sánh series-với-series trong cùng một nhóm (kỳ này vs kỳ trước).",
    ],
    tranh: [
      "Câu hỏi là “tổng bao nhiêu và cơ cấu ra sao” → cột chồng, vì cột nhóm không cho thấy tổng.",
      "Số nhóm × số series > ~24 cột → tách thành nhiều chart nhỏ.",
    ],
    dang_du_lieu: "label = nhóm, series = tên series, value = giá trị.",
  },
  {
    id: "stacked-bar",
    ten: "Cột chồng",
    job: "composition",
    mo_ta: "Các thành phần xếp chồng, chiều cao cột là tổng.",
    nen_dung: [
      "Câu hỏi là “tổng bao nhiêu VÀ gồm những gì” — cần cả hai.",
      "2–5 thành phần. Đặt thành phần quan trọng nhất xuống ĐÁY để nó có đường gốc chung.",
    ],
    tranh: [
      "Cần so sánh chính xác một thành phần ở GIỮA giữa các cột → tách chart riêng.",
      "Hơn 5–6 thành phần → gộp đuôi thành “Khác”.",
      "Thành phần có giá trị âm → cột chồng vỡ nghĩa, dùng waterfall.",
    ],
    dang_du_lieu: "label = nhóm, series = thành phần, value = giá trị.",
  },
  {
    id: "stacked-100",
    ten: "Cột chồng 100%",
    job: "composition",
    mo_ta: "Như cột chồng nhưng chuẩn hoá mỗi cột về 100%.",
    nen_dung: [
      "So sánh cơ cấu giữa các đối tượng có quy mô rất chênh lệch.",
      "Câu hỏi thuần về tỷ lệ, không về quy mô.",
    ],
    tranh: [
      "Người xem cũng cần biết quy mô — biểu đồ này giấu mất. Ghép thêm cột số tổng.",
      "Cơ cấu gần như giống nhau ở mọi nhóm → chẳng có gì để kể, dùng bảng.",
    ],
    dang_du_lieu: "Giống cột chồng; app tự chuẩn hoá về 100%.",
  },
  {
    id: "donut",
    ten: "Biểu đồ vành khuyên",
    job: "composition",
    mo_ta: "Một tổng chia thành vài lát, số tổng đặt ở lỗ giữa.",
    nen_dung: [
      "2–4 lát, chênh lệch rõ ràng.",
      "Chỉ có MỘT tổng để mổ xẻ (không so giữa nhiều nhóm).",
    ],
    tranh: [
      "Trên 5 lát → dùng thanh ngang, đọc nhanh và chính xác hơn hẳn.",
      "Các lát xấp xỉ nhau → không ai phân biệt được góc 24% với 26%.",
      "Không bao giờ tách lát (exploded), không bao giờ 3D.",
    ],
    dang_du_lieu: "label = tên lát, value = giá trị không âm.",
  },
  {
    id: "waterfall",
    ten: "Waterfall (thác nước)",
    job: "flow",
    mo_ta: "Phân rã một mức chênh lệch thành các khoản cộng trừ.",
    nen_dung: [
      "Phân rã: doanh thu → lợi nhuận, kế hoạch → thực hiện, kỳ trước → kỳ này.",
      "Các khoản cộng lại ĐÚNG bằng số cuối — nếu không thì biểu đồ đang nói dối.",
      "4–10 bước.",
    ],
    tranh: [
      "Quá 10 bước → cột nào cũng bé xíu; gộp các khoản nhỏ thành “Khác”.",
      "Thứ tự các bước không có ý nghĩa → waterfall ngụ ý một trình tự.",
    ],
    dang_du_lieu: "label = tên khoản, value = mức cộng/trừ (âm là trừ), theo đúng thứ tự.",
  },
  {
    id: "funnel",
    ten: "Phễu",
    job: "flow",
    mo_ta: "Các bậc của một quy trình, bậc sau là tập con của bậc trước.",
    nen_dung: [
      "Quy trình tuyến tính, và bậc sau là TẬP CON của bậc trước.",
      "Cần chỉ ra bước nào mất khách nhiều nhất. 3–7 bậc.",
    ],
    tranh: [
      "Các bậc không phải tập con của nhau → đó chỉ là bar chart đội lốt phễu, hình dạng thu hẹp là bịa.",
      "Người dùng có thể quay lại bậc trước hoặc nhảy cóc → phễu che mất điều đó.",
    ],
    dang_du_lieu: "label = tên bậc, value = số lượng, giảm dần theo thứ tự.",
  },
  {
    id: "heatmap",
    ten: "Bản đồ nhiệt",
    job: "pattern",
    mo_ta: "Lưới hai chiều danh mục, độ đậm thể hiện độ lớn.",
    nen_dung: [
      "Hai chiều danh mục rõ ràng (giờ × thứ, tuần × tháng, sản phẩm × vùng).",
      "Cần thấy “vùng nóng” chứ không cần đọc số chính xác.",
      "Lưới đủ đặc — hầu hết ô đều có dữ liệu.",
    ],
    tranh: [
      "Cần so sánh giá trị chính xác → mắt người ước lượng độ đậm rất tệ.",
      "Lưới thưa, nhiều ô rỗng → nhìn như nhiễu.",
      "Thang màu cầu vồng — cấm tuyệt đối. Sequential phải là MỘT hue, nhạt → đậm.",
    ],
    dang_du_lieu: "label = trục ngang, series = trục dọc, value = độ đậm.",
  },
  {
    id: "scatter",
    ten: "Biểu đồ phân tán",
    job: "correlation",
    mo_ta: "Mỗi quan sát là một điểm trên hai trục liên tục.",
    nen_dung: [
      "Cần kiểm tra quan hệ giữa hai đại lượng liên tục.",
      "Cần soi ngoại lệ — điểm lạc ra khỏi đám mây chính.",
      "Có từ ~20 quan sát trở lên (ít hơn thì bảng là đủ).",
    ],
    tranh: [
      "Một trong hai trục là danh mục → không phải scatter.",
      "Đừng vẽ đường xu hướng rồi kết luận nhân quả — tương quan không phải nhân quả.",
    ],
    dang_du_lieu: "label = tên điểm, value = trục x, value2 = trục y.",
  },
];

export const chartType = (id: string) => CHART_TYPES.find((c) => c.id === id);

export const chartTypeName = (id: string) => chartType(id)?.ten ?? id;

export function chartTypesByJob(): { job: Job; types: ChartType[] }[] {
  return JOBS.map((job) => ({
    job,
    types: CHART_TYPES.filter((t) => t.job === job.id),
  })).filter((g) => g.types.length > 0);
}
