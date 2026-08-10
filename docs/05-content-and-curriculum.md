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
