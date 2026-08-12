# 05 — Content & Curriculum Model

## Nguyên tắc

Nội dung production phải được mapping với chương trình/chuẩn kiến thức chính thức đang áp dụng tại Việt Nam và được kiểm chứng trước khi phát hành.

Repo hiện tại **chưa coi bất kỳ danh sách level nào là curriculum chính thức**.

## Cấu trúc dữ liệu đề xuất

Mỗi learning objective nên có:
- `grade`
- `subject`
- `domain`
- `skill_id`
- `skill_name_vi`
- `objective_vi`
- `prerequisites`
- `difficulty`
- `source_reference`
- `approved`
- `gameplay_templates`

## Tách curriculum khỏi game

Một skill có thể có nhiều gameplay.

Ví dụ:
`MATH_G1_ADD_WITHIN_X`
→ collect
→ path puzzle
→ matching
→ story scenario
→ boss phase

Điều này giúp:
- tránh nhàm chán,
- A/B test gameplay,
- tái sử dụng engine,
- thay đổi nội dung mà không viết lại game.

## AI-generated content

AI chỉ được sinh variation bên trong constraints:
- objective đã duyệt,
- phạm vi số đã duyệt,
- vocabulary phù hợp,
- format validation,
- answer validation.

Nên có content pipeline:
Official objective
→ Human-approved content schema
→ Generated variations
→ Automated validation
→ Human sample review
→ Release.

## Prototype implementation gate

Repo có validator local tại `src/curriculumEngine.js`.

- `npm run audit:curriculum`: kiểm tra schema và quan hệ prerequisite cho nội dung prototype.
- `npm run audit:curriculum:release`: production gate; trả exit code khác 0 nếu còn node chưa `approved` hoặc chỉ có prototype source.
- `npm run build:demo`: build bản trải nghiệm prototype sau prototype audit.
- `npm run build`: production build fail-closed và luôn chạy release audit trước Vite.

Production gate không tự suy luận hay tự cấp approval. Việc chuyển `approved: true` phải đi cùng `sourceEvidence` có loại nguồn official, document id, revision, reviewer và review timestamp.

## Review packet

`src/curriculumReview.js` tạo packet read-only cho owner/reviewer:

- tách rõ prototype audit và production audit;
- phân loại từng node thành `needs-official-source`, `needs-human-approval`, `needs-review-evidence`, `invalid` hoặc `release-ready`;
- giữ lại skill, mechanic, prerequisite, objective và required action để review theo từng màn;
- không sửa node, không tự thêm `sourceEvidence`, không tự chuyển `approved`.

Chạy `npm run curriculum:review` để xem Markdown hoặc `npm run curriculum:review -- --json` để tích hợp vào review tool sau này.

## Interaction spec registry

`src/interactionSpecs.js` tách learning-facing interaction khỏi component implementation. Mỗi mechanic có contract cho entry state, objects, gestures/drop zones, rules, success, soft-fail, 3 hint levels, mastery events, animation/audio cues và exit state. `auditInteractionSpecs(nodes)` đảm bảo mọi node runtime đều có spec hợp lệ; UI chỉ lấy gesture label ngắn từ registry.
