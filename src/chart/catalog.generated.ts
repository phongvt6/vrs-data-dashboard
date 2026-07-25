// ⚙️ TỰ SINH từ ui-chart-catalog — chạy `npm run sync-charts`. ĐỪNG SỬA TAY.
//
// Nguồn sự thật của taxonomy chart (tên, mã, nên/tránh dùng, dạng dữ liệu) là app
// ui-chart-catalog. File này chỉ chứa các loại vrs RENDER được (xem SUPPORTED
// trong scripts/sync-chart-catalog.mjs). Sửa hướng dẫn → sửa bên catalog rồi sync.

import type { Job, ChartType } from "./types";

export const JOBS: Job[] = [
  {
    "id": "single-value",
    "ten": "Một con số",
    "cau_hoi": "Hôm nay con số đó là bao nhiêu, hơn kém kỳ trước thế nào?"
  },
  {
    "id": "compare",
    "ten": "So sánh",
    "cau_hoi": "Ai nhiều hơn ai, hơn bao nhiêu?"
  },
  {
    "id": "composition",
    "ten": "Cơ cấu",
    "cau_hoi": "Cái tổng đó gồm những phần nào, mỗi phần chiếm bao nhiêu?"
  },
  {
    "id": "trend",
    "ten": "Xu hướng",
    "cau_hoi": "Đang tăng hay giảm, từ lúc nào?"
  },
  {
    "id": "pattern",
    "ten": "Quy luật theo lưới",
    "cau_hoi": "Cao điểm rơi vào khung giờ nào, ngày nào?"
  },
  {
    "id": "correlation",
    "ten": "Tương quan",
    "cau_hoi": "X tăng thì Y có tăng theo không?"
  },
  {
    "id": "flow",
    "ten": "Luồng & biến động",
    "cau_hoi": "Từ đâu chảy đến đâu, cộng trừ những gì ra số cuối?"
  }
];

export const CHART_TYPES: ChartType[] = [
  {
    "id": "stat-tile",
    "ten": "Ô chỉ số (KPI)",
    "job": "single-value",
    "mo_ta": "Một con số hiện tại, kèm mức chênh so với kỳ trước và (tuỳ chọn) một sparkline nhỏ cho biết nó đang đi hướng nào. Xếp 3–5 ô thành một hàng ở đầu dashboard.",
    "nen_dung": [
      "Người xem chỉ cần biết “hôm nay bao nhiêu, hơn kém hôm qua thế nào”.",
      "Đầu dashboard, trước khi vào các biểu đồ chi tiết.",
      "Con số quan trọng đến mức không được để nó lẫn trong một biểu đồ."
    ],
    "tranh": [
      "Có hơn 5–6 chỉ số → thành bức tường số, không ai đọc. Cắt còn 3–5 cái thật sự dẫn dắt quyết định.",
      "Chỉ số cần ngữ cảnh mới hiểu (ví dụ “tỷ lệ chuyển đổi 3,2%” mà không có mốc so sánh) → thêm delta hoặc dùng meter.",
      "Đừng thay một ô chỉ số bằng biểu đồ cột có đúng một cột — đó là lãng phí không gian."
    ],
    "dang_du_lieu": "Một giá trị hiện tại + một giá trị kỳ trước (để tính delta) + tuỳ chọn một chuỗi ~12 điểm cho sparkline.",
    "cao": 1
  },
  {
    "id": "meter",
    "ten": "Thanh tiến độ (meter)",
    "job": "single-value",
    "mo_ta": "Một tỷ lệ so với hạn mức 100%. Phần chưa đạt dùng bậc NHẠT HƠN của cùng một hue, để trạng thái đọc được trên toàn thanh chứ không chỉ ở phần đã tô.",
    "nen_dung": [
      "Có một mốc trần rõ ràng: chỉ tiêu tháng, dung lượng kho, % hoàn thành.",
      "Người xem chỉ cần biết “đã tới đâu so với đích”, không cần con số tuyệt đối."
    ],
    "tranh": [
      "Không có trần tự nhiên → tỷ lệ so với cái gì? Dùng stat tile.",
      "Cần so sánh nhiều đối tượng cùng lúc → dùng bullet chart, đọc nhanh hơn nhiều thanh rời rạc.",
      "Đừng dùng gauge hình bán nguyệt (kim đồng hồ): tốn gấp 3 diện tích để chở đúng một con số."
    ],
    "dang_du_lieu": "Một giá trị thực hiện + một giá trị trần.",
    "cao": 1
  },
  {
    "id": "line",
    "ten": "Biểu đồ đường",
    "job": "trend",
    "mo_ta": "Nối các điểm theo thời gian. Độ dốc chở thông tin “đang tăng/giảm nhanh chậm ra sao” — thứ mà biểu đồ cột không diễn đạt được.",
    "nen_dung": [
      "Trục hoành là thời gian liên tục, khoảng cách đều nhau.",
      "Từ ~8 điểm trở lên (ít hơn thì cột đọc rõ hơn).",
      "Cần so sánh hình dạng giữa 2–4 đối tượng."
    ],
    "tranh": [
      "Trục hoành là danh mục rời rạc (tên chi nhánh, tên sản phẩm) — nối chúng bằng đường là bịa ra một sự liên tục không có thật.",
      "Quá 4–5 đường hội tụ vào nhau → nhãn cuối dính chùm; tách small multiples.",
      "Dữ liệu có lỗ hổng → phải để đứt đoạn, đừng nối thẳng qua chỗ thiếu."
    ],
    "dang_du_lieu": "Mỗi series là một mảng giá trị theo cùng một trục thời gian."
  },
  {
    "id": "area",
    "ten": "Biểu đồ miền",
    "job": "trend",
    "mo_ta": "Đường có tô nền xuống trục gốc. Phần tô gợi ý “khối lượng tích luỹ”, hợp khi giá trị là một lượng cộng dồn được.",
    "nen_dung": [
      "MỘT series duy nhất, và bạn muốn nhấn cảm giác khối lượng.",
      "Trục giá trị bắt đầu từ 0 (bắt buộc — phần tô vô nghĩa nếu cắt gốc)."
    ],
    "tranh": [
      "Nhiều series chồng lấn → miền này che miền kia. Dùng đường thường.",
      "Giá trị là tỷ lệ, chỉ số, nhiệt độ — những thứ không “cộng dồn” được thì phần tô nói dối.",
      "Đừng tô đậm (opacity cao). 10% là đủ; đậm hơn thì phần tô át mất chính đường."
    ],
    "dang_du_lieu": "Một mảng giá trị không âm theo trục thời gian."
  },
  {
    "id": "column",
    "ten": "Biểu đồ cột",
    "job": "compare",
    "mo_ta": "Cột mọc từ một đường gốc chung, chiều cao chở giá trị. Dạng so sánh chính xác nhất mà mắt người đọc được — độ dài là kênh mã hoá mạnh nhất.",
    "nen_dung": [
      "So sánh 3–12 hạng mục có tên ngắn.",
      "Trục giá trị bắt đầu từ 0 (bắt buộc — cắt gốc là bóp méo).",
      "Thứ tự hạng mục tự nhiên (thời gian) hoặc sắp xếp theo giá trị."
    ],
    "tranh": [
      "Tên hạng mục dài → xoay nhãn 45° là dấu hiệu bạn nên dùng thanh ngang.",
      "Hơn ~12 hạng mục → thanh ngang hoặc bảng.",
      "KHÔNG BAO GIỜ cắt gốc trục để “nhìn cho rõ chênh lệch”. Cần soi chênh lệch nhỏ thì vẽ đường, hoặc vẽ chính phần chênh lệch."
    ],
    "dang_du_lieu": "Một cột danh mục + một cột giá trị số. Mỗi hạng mục đúng một dòng."
  },
  {
    "id": "bar",
    "ten": "Thanh ngang",
    "job": "compare",
    "mo_ta": "Cột nằm ngang. Cùng sức mạnh mã hoá như cột đứng, nhưng nhãn hạng mục chạy ngang nên đọc thoải mái dù tên dài.",
    "nen_dung": [
      "Tên hạng mục dài (tên chi nhánh, tên sản phẩm, câu trả lời khảo sát).",
      "Bảng xếp hạng — sắp xếp giảm dần, top-N.",
      "Nhiều hạng mục (10–25) — cuộn dọc tự nhiên hơn cuộn ngang."
    ],
    "tranh": [
      "Trục là thời gian → thời gian phải chạy ngang, dùng cột đứng hoặc đường.",
      "Chỉ có 2–3 hạng mục tên ngắn → cột đứng gọn hơn."
    ],
    "dang_du_lieu": "Giống cột đứng: một cột danh mục + một cột giá trị."
  },
  {
    "id": "grouped-bar",
    "ten": "Cột nhóm",
    "job": "compare",
    "mo_ta": "Nhiều series đứng cạnh nhau trong từng nhóm. Dùng khi phải so sánh CẢ hai chiều: giữa các nhóm và giữa các series trong một nhóm.",
    "nen_dung": [
      "2–3 series, 3–8 nhóm. Vượt mức đó là rừng cột.",
      "Người xem cần so sánh series-với-series trong cùng một nhóm (ví dụ kỳ này vs kỳ trước)."
    ],
    "tranh": [
      "Câu hỏi là “tổng bao nhiêu và cơ cấu ra sao” → stacked bar, vì cột nhóm không cho thấy tổng.",
      "Từ 4 series trở lên: vàng và cam bắt đầu đứng cạnh nhau, phải có nhãn trực tiếp — thường small multiples là lựa chọn đúng hơn.",
      "Số nhóm × số series > ~24 cột → tách thành small multiples."
    ],
    "dang_du_lieu": "Ma trận nhóm × series. Mỗi series là một mảng cùng độ dài với danh sách nhóm."
  },
  {
    "id": "stacked-bar",
    "ten": "Cột chồng",
    "job": "composition",
    "mo_ta": "Mỗi cột là một tổng, chia thành các phần theo một chiều thứ hai. Đọc được TỔNG và phần ĐÁY chính xác; các phần ở giữa chỉ ước lượng được vì chúng không chung đường gốc.",
    "nen_dung": [
      "Câu hỏi là “tổng bao nhiêu VÀ gồm những gì” — cần cả hai.",
      "2–5 thành phần. Đặt thành phần quan trọng nhất xuống ĐÁY để nó có đường gốc chung."
    ],
    "tranh": [
      "Người xem cần so sánh chính xác một thành phần ở GIỮA giữa các cột → tách thành small multiples hoặc line riêng.",
      "Hơn 5–6 thành phần → gộp đuôi thành “Khác”.",
      "Thành phần có giá trị âm → cột chồng vỡ nghĩa, dùng waterfall hoặc diverging bar."
    ],
    "dang_du_lieu": "Ma trận nhóm × thành phần, các thành phần cộng lại ra tổng của nhóm."
  },
  {
    "id": "stacked-100",
    "ten": "Cột chồng 100%",
    "job": "composition",
    "mo_ta": "Mọi cột kéo dài bằng nhau; chỉ TỶ TRỌNG được so sánh. Trả lời “cơ cấu có khác nhau không”, và cố tình vứt bỏ thông tin về quy mô.",
    "nen_dung": [
      "So sánh cơ cấu giữa các đối tượng có quy mô rất chênh lệch.",
      "Câu hỏi thuần về tỷ lệ: “chi nhánh nào phụ thuộc nhóm Thiết bị nhiều nhất?”"
    ],
    "tranh": [
      "Người xem cũng cần biết quy mô — biểu đồ này giấu mất. Ghép thêm một cột số tổng, hoặc dùng cột chồng thường.",
      "Cơ cấu gần như giống nhau ở mọi nhóm → chẳng có gì để kể, dùng bảng."
    ],
    "dang_du_lieu": "Giống cột chồng, nhưng chuẩn hoá mỗi nhóm về 100%."
  },
  {
    "id": "donut",
    "ten": "Biểu đồ vành khuyên",
    "job": "composition",
    "mo_ta": "Cơ cấu của MỘT tổng duy nhất. Mắt người so góc kém hơn so độ dài rất nhiều — nên đây là dạng yếu, chỉ dùng khi số lát ít và thông điệp là “một lát chiếm phần lớn”.",
    "nen_dung": [
      "2–4 lát, chênh lệch rõ ràng.",
      "Chỉ có MỘT tổng để mổ xẻ (không so giữa nhiều nhóm).",
      "Lỗ giữa donut là chỗ đặt con số tổng — tận dụng nó."
    ],
    "tranh": [
      "Trên 5 lát → dùng thanh ngang, đọc nhanh và chính xác hơn hẳn.",
      "Các lát xấp xỉ nhau → không ai phân biệt được góc 24% với 26%.",
      "So sánh cơ cấu giữa nhiều nhóm → tuyệt đối không dùng nhiều pie cạnh nhau; dùng cột chồng 100%.",
      "Không bao giờ tách lát (exploded), không bao giờ 3D."
    ],
    "dang_du_lieu": "Danh sách {tên, giá trị} không âm, cộng lại ra một tổng có nghĩa."
  },
  {
    "id": "waterfall",
    "ten": "Waterfall (thác nước)",
    "job": "flow",
    "mo_ta": "Đi từ số đầu kỳ đến số cuối kỳ, mỗi cột là một khoản cộng hoặc trừ. Trả lời câu hỏi mà không biểu đồ nào khác trả lời gọn được: “vì sao từ đây thành ra kia”.",
    "nen_dung": [
      "Phân rã một mức chênh lệch: doanh thu → lợi nhuận, kế hoạch → thực hiện, kỳ trước → kỳ này.",
      "Các khoản cộng lại ĐÚNG bằng số cuối — nếu không thì biểu đồ đang nói dối.",
      "4–10 bước."
    ],
    "tranh": [
      "Quá 10 bước → cột nào cũng bé xíu; gộp các khoản nhỏ thành “Khác”.",
      "Thứ tự các bước không có ý nghĩa → waterfall ngụ ý một trình tự; nếu không có thì dùng bar chart.",
      "Các khoản chồng lấn nhau (một khoản đã bao gồm khoản kia) → tổng sai, phải làm sạch số trước."
    ],
    "dang_du_lieu": "Chuỗi CÓ THỨ TỰ: nhãn + delta (dương/âm), cộng một mốc đầu và một mốc cuối. Chân đế mỗi cột do mình tính tích luỹ."
  },
  {
    "id": "funnel",
    "ten": "Phễu",
    "job": "flow",
    "mo_ta": "Các bậc thu hẹp dần theo một quy trình có thứ tự. Giá trị nằm ở tỷ lệ RƠI RỤNG giữa hai bậc liền kề — đó mới là con số cần đọc, không phải chiều rộng của bậc.",
    "nen_dung": [
      "Quy trình tuyến tính, và bậc sau là TẬP CON của bậc trước.",
      "Cần chỉ ra bước nào mất khách nhiều nhất.",
      "3–7 bậc."
    ],
    "tranh": [
      "Các bậc không phải tập con của nhau → đó chỉ là bar chart đội lốt phễu, và hình dạng thu hẹp là bịa.",
      "Người dùng có thể quay lại bậc trước, hoặc nhảy cóc → phễu che mất điều đó; dùng sankey.",
      "Cần so sánh phễu giữa nhiều nhóm → dùng bảng tỷ lệ chuyển đổi, phễu không xếp cạnh nhau được."
    ],
    "dang_du_lieu": "Chuỗi bậc CÓ THỨ TỰ + số lượng mỗi bậc, giảm dần đơn điệu."
  },
  {
    "id": "heatmap",
    "ten": "Bản đồ nhiệt",
    "job": "pattern",
    "mo_ta": "Một lưới hai chiều, độ đậm của ô chở giá trị. Tìm QUY LUẬT theo lưới — cao điểm rơi vào khung giờ nào, ngày nào — thứ mà 56 cột trong một biểu đồ cột không bao giờ cho thấy.",
    "nen_dung": [
      "Hai chiều danh mục rõ ràng (giờ × thứ, tuần × tháng, sản phẩm × vùng).",
      "Cần thấy “vùng nóng” chứ không cần đọc số chính xác.",
      "Lưới đủ đặc — hầu hết ô đều có dữ liệu."
    ],
    "tranh": [
      "Cần so sánh giá trị chính xác → mắt người ước lượng độ đậm rất tệ. Kèm thêm bảng, hoặc gắn số vào ô.",
      "Lưới thưa, nhiều ô rỗng → nhìn như nhiễu.",
      "Thang màu cầu vồng — cấm tuyệt đối. Sequential phải là MỘT hue, nhạt → đậm."
    ],
    "dang_du_lieu": "Bộ ba [chỉ số cột, chỉ số dòng, giá trị] cho từng ô của lưới."
  },
  {
    "id": "scatter",
    "ten": "Biểu đồ phân tán",
    "job": "correlation",
    "mo_ta": "Mỗi điểm là một quan sát, đặt theo hai chỉ số. Dạng duy nhất trả lời trực tiếp “X tăng thì Y có tăng theo không, và ngoại lệ nằm ở đâu”.",
    "nen_dung": [
      "Cần kiểm tra quan hệ giữa hai đại lượng liên tục.",
      "Cần soi ngoại lệ — điểm lạc ra khỏi đám mây chính.",
      "Có từ ~20 quan sát trở lên (ít hơn thì bảng là đủ)."
    ],
    "tranh": [
      "Một trong hai trục là danh mục → không phải scatter, đó là dot plot.",
      "Quá nhiều điểm chồng lên nhau → giảm opacity, hoặc chuyển sang heatmap mật độ.",
      "Đừng vẽ đường xu hướng rồi kết luận nhân quả — tương quan không phải nhân quả.",
      "Đây là dạng “mọi cặp màu cùng xuất hiện”: trần 3 màu. Nhiều nhóm hơn thì tách small multiples."
    ],
    "dang_du_lieu": "Danh sách quan sát, mỗi quan sát có [x, y] và (tuỳ chọn) nhóm."
  }
];
