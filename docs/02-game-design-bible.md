# 02 — Game Design Bible v0.1

## A. Thế giới

### Lumora
Một thế giới giả tưởng được duy trì bởi **Lõi Tri Thức**.

### Biến cố: Đại Lãng Quên
Lõi Tri Thức bị phân mảnh. Các **Mảnh Tri Thức** bị thất lạc khắp thế giới khiến các vùng đất dần mất khả năng vận hành.

Người chơi trở thành **Người Giữ Tri Thức**, đồng hành cùng một Linh Thú để phục hồi Lumora.

## B. Linh Thú

### Mục tiêu
Tạo một IP riêng, dễ thương với trẻ nhỏ nhưng có thể trưởng thành về thiết kế khi người chơi lên cấp cao hơn.

### Hướng hình tượng ưu tiên
Sinh vật giả tưởng lai giữa:
- mèo/gấu nhỏ,
- tinh linh,
- yếu tố ánh sáng/tinh thể.

Không sao chép rõ ràng cáo/rồng/Pokémon hiện có.

### Đặc điểm signature
- **Lõi Tri Thức** trên ngực.
- Rune/hoa văn xuất hiện theo mastery.
- Hình thái thay đổi khi tiến hóa.
- Có thể mở cánh/sừng/đuôi/giáp ở evolution cao.
- Biểu cảm mạnh để hỗ trợ storytelling.

### Tên mascot làm việc
**Momo** hoặc **Lumii** — chưa chốt.

## C. Hệ năng lượng

Ví dụ:
- Logic Energy — Toán & suy luận.
- Nature Energy — tự nhiên/khoa học.
- Discovery Energy — khám phá/puzzle.
- Mastery Energy — hoàn thành thử thách tổng hợp.

Tên sẽ Việt hóa hoặc dùng tên lore tiếng Việt ở production.

### Prototype implementation

Runtime giữ bốn counter allowlist trong progress: `logic`, `nature`, `discovery` và `mastery`. Node/quest chỉ khai báo category qua data; first-clear mới cộng năng lượng theo mastery (`independent` +2, `guided/support` +1), replay không farm. `Nature Energy` chưa được cấp trong World 1 vì chưa có curriculum Khoa học/Tự nhiên và nguồn chính thức đã được duyệt. `src/nubiResonance.js` dùng cùng registry để tạo feedback visual: ambient intensity 1 trong gameplay, reward/first-clear intensity 2 ở success/restoration, không tác động learning outcome.

## D. Evolution

Evolution không dựa chủ yếu vào thời gian chơi.

Ví dụ:
- đạt mastery mục tiêu,
- hoàn thành chapter,
- vượt boss,
- hoàn thành challenge.

Nhờ đó **học thật → tiến hóa thật**.

### Prototype progression signal

Runtime tách `XP` khỏi `Mảnh Tri Thức`: first-clear nhận XP theo reward và mastery, còn replay chỉ luyện kỹ năng và không farm XP. XP là tín hiệu progression cho HUD, reward screen và Parent Dashboard; nó không thay thế mastery hoặc curriculum approval.

### Prototype implementation

Nubi hiện có hai hình thái data-driven: `Mầm Sáng` và `Dẫn Quang`. First clear Boss chuyển stage 1 → 2, thay sprite thật ở Home/City/Creature, mở cinematic có reduced-motion fallback và giữ stage qua local persistence. Boss replay không tạo transition mới.

## E. Thế giới theo lớp

Tên chỉ là working concept:

- Lớp 1 — Rừng Thức Tỉnh
- Lớp 2 — Dòng Sông Pha Lê
- Lớp 3 — Sa Mạc Cơ Giới
- Lớp 4 — Vương Quốc Trên Mây
- Lớp 5 — Biên Giới Tinh Tú

Lớp không nhất thiết phải được nhấn mạnh liên tục trong UI game; lore/world nên đứng phía trước.

## F. Cấu trúc một World

Khoảng 20–30 level:
- Main Quest: kiến thức cốt lõi.
- Side Quest: luyện tập/mở rộng.
- Challenge: thử thách khó hơn.
- Secret Quest: puzzle bí mật.
- Boss: tổng hợp knowledge.

Không bắt buộc mọi Side/Secret Quest để đi tiếp.

### Prototype implementation

Rừng Thức Tỉnh hiện có hai Side Quest và một Secret Quest data-driven. Các nhánh này chỉ tái tổ hợp mechanic đã học, mở theo prerequisite, ghi mastery riêng và thưởng cosmetic một lần; chúng không nằm trong chuỗi prerequisite của 12 Main Quest và không cấp Mảnh Tri Thức.

## G. Gameplay library

Không lặp lại một pattern duy nhất.

Các dạng có thể gồm:
- Kéo/thả vật thể.
- Ghép cặp.
- Sắp xếp thứ tự.
- Chọn đường đi.
- Xây cầu.
- Thu thập đúng số lượng.
- Puzzle hình học.
- Time challenge không gây áp lực quá mức.
- Environmental puzzle.
- Mini simulation.
- Boss multi-phase.
- Real-world scenario.

Ví dụ phép cộng có thể xuất hiện dưới nhiều hình:
- thêm cá vào hồ,
- ghép nhóm,
- chọn cánh cửa,
- kích hoạt crystal,
- giải bài toán mua bán đơn giản.

## H. Boss

Boss không nhất thiết là đánh nhau bạo lực.

Có thể là:
- giải cứu,
- thanh tẩy,
- sửa chữa,
- phục hồi,
- phá lời nguyền.

Boss Lớp 1 làm việc: **Kẻ Nuốt Con Số**.

Boss có nhiều phase kiểm tra các kỹ năng chính của World.

## I. Knowledge City

Mỗi trẻ có một thành phố/hòn đảo riêng.

Mastery mở khóa công trình:
- Tháp Logic.
- Phòng Thí Nghiệm Tự Nhiên.
- Xưởng Hình Khối.
- Đài Quan Sát.
- Thư viện.
- Các công trình cosmetic.

Trong prototype, bốn công trình runtime giữ mốc xây 3/7/9/12 chặng và thêm mastery gate tối thiểu 2 trên nhóm node nền tương ứng. Như vậy số chặng tạo nhịp mở khóa, còn chất lượng làm bài quyết định công trình đã thực sự tỏa sáng hay chưa.

Knowledge City là:
- reward,
- status,
- visualization về hành trình học tập.

## J. Trang bị

Ví dụ:
- Trượng Tri Thức.
- Khiên Logic.
- Vương Miện Con Số.
- Cánh Khám Phá.
- Quả Cầu Khoa Học.

Không tăng khả năng “trả lời đúng” bằng tiền.

## K. Daily Adventure

Một phiên lý tưởng khoảng 15–20 phút:
- một số thử thách học,
- một puzzle,
- một discovery activity.

Reward có thể là:
- Mảnh Tiến Hóa,
- cosmetic,
- vật liệu xây thành phố.

Không tạo pressure phải chơi hàng giờ.

## L. League / Ranking

Không ưu tiên bảng xếp hạng toàn quốc theo tổng điểm.

Dùng league:
- Đồng
- Bạc
- Vàng
- Kim Cương
- Bậc Thầy

Nhóm nhỏ ~20–30 người có trình độ gần nhau.

Điểm nên dựa trên mastery/challenge, không chỉ time played.

## M. Campaign / World boundary

Mỗi World phải có registry riêng gồm `id`, grade, trạng thái playable/preview, danh sách Main Quest, Optional Quest, Boss và prerequisite World. Completion được tính trong node boundary của World đó; node từ World khác không được mở khóa hoặc hoàn tất chéo.

Prototype hiện ánh xạ toàn bộ 12 node của Rừng Thức Tỉnh vào `forest-awakening`. World kế tiếp chỉ tồn tại dưới dạng preview không playable để chứng minh khả năng mở rộng; không thêm level hoặc curriculum giả trước khi có source evidence và phê duyệt.

Runtime hiện cho phép mở một màn hình blueprint read-only của World kế tiếp ngay từ bản đồ. Màn hình này chỉ trình bày lore, hướng trải nghiệm và gate phê duyệt; không có node, reward, progress hoặc curriculum approval nào được tạo từ preview.
