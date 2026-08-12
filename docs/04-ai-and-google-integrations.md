# 04 — AI & Google Integrations

## 1. Gemini — Oracle

Oracle là nhân vật AI dẫn đường.

### Chức năng MVP
- Phân tích loại lỗi sai.
- Đưa hint từng bước.
- Dùng tiếng Việt phù hợp độ tuổi.
- Thay đổi cách giải thích nếu trẻ tiếp tục sai.
- Khuyến khích ngắn gọn, không phán xét.

### Không nên
- Cho đáp án ngay lập tức.
- Hội thoại mở vô hạn.
- Tự tạo curriculum không kiểm duyệt.

## 2. Adaptive Learning

Hồ sơ mastery có thể gồm:
- skill_id,
- attempts,
- accuracy,
- hint_usage,
- response_time,
- mastery_score.

Ví dụ hệ thống nhận ra trẻ yếu ở đọc giờ:
- tăng xác suất gặp nhiệm vụ liên quan,
- giảm độ phức tạp ban đầu,
- Oracle đưa ví dụ trực quan hơn.

## 3. Firebase

Dùng cho:
- Authentication/Profile.
- Progression.
- Mastery data.
- Inventory.
- Leaderboard/League.
- Parent dashboard data.

## 4. Google technologies khác

Có thể cân nhắc sau MVP:
- Google Maps cho nhiệm vụ địa lý.
- Workspace/Classroom cho giáo viên.
- Speech/voice cho bài đọc/ngôn ngữ.
- Analytics/BigQuery cho learning analytics.

## 5. AI Riser strategy

Các tích hợp Google phải tự nhiên với sản phẩm:
- Gemini = adaptive mentor.
- Firebase = progression & data.
- Deploy app = demo thực tế.

Không tích hợp công nghệ chỉ để “có logo Google”.

## 6. Implementation contract hiện tại

Prototype vẫn local-first. Các adapter cloud chưa active và readiness audit mặc định fail-closed.

- Gemini: client chỉ gửi allowlist dữ liệu học tập không định danh tới `/api/...`; server phải giữ API key, xác thực parent session và chỉ trả hint `approved`, `curriculumBound`, tối đa 240 ký tự. Endpoint lỗi, timeout hoặc response sai schema sẽ dùng rule-based Oracle local.
- Firebase: tiến trình chỉ được phép nằm ở `parents/{parentId}/children/{childId}` với parent-owned authentication và Security Rules v2 đã deploy. Sync dùng revision compare-and-set để không âm thầm ghi đè dữ liệu mới hơn.
- Persistent web cache mặc định tắt. Chỉ được bật sau consent rõ ràng trên thiết bị phụ huynh tin cậy.
- Payload cloud loại bỏ alias, email, age band và dữ liệu ngoài canonical progress schema; `campaignState` chỉ giữ `activeWorldId`/`completedWorldIds` nằm trong world-id allowlist.
- Readiness flags là điều kiện cấu hình, không phải bằng chứng Firebase Rules hay backend đã thực sự deploy; cần integration test và security review trước khi bật.
