# Lumora — 500 Level Design Catalog (Lớp 1–5)

> **Trạng thái:** Game-design proposal v0.1 — chưa phải curriculum approval.  
> **Nguồn curriculum:** `docs/13-vietnam-primary-natural-curriculum.md`.  
> **Quy mô:** 5 lớp × 100 màn = **500 màn**.  
> **Boss cadence:** cứ 9 màn thường → 1 Boss; Level 100 của mỗi lớp là **Grand Boss** tổng hợp toàn bộ kiến thức của lớp.

## 1. Mục tiêu

Catalog này chuyển curriculum Toán + khoa học tự nhiên cấp tiểu học thành progression game cho Lumora theo nguyên tắc:

`Skill → Gameplay mechanic → Mastery evidence → World restoration → Boss transfer → Progression`

Không thiết kế theo kiểu `Bài học → câu hỏi → 4 đáp án`.

## 2. Cấu trúc repo

| Lớp | World | File chi tiết | Số màn | Boss |
|---|---|---|---:|---:|
| 1 | Rừng Thức Tỉnh | [`docs/levels/grade-1.md`](levels/grade-1.md) | 100 | 10 |
| 2 | Dòng Sông Pha Lê | [`docs/levels/grade-2.md`](levels/grade-2.md) | 100 | 10 |
| 3 | Sa Mạc Cơ Giới | [`docs/levels/grade-3.md`](levels/grade-3.md) | 100 | 10 |
| 4 | Vương Quốc Trên Mây | [`docs/levels/grade-4.md`](levels/grade-4.md) | 100 | 10 |
| 5 | Biên Giới Tinh Tú | [`docs/levels/grade-5.md`](levels/grade-5.md) | 100 | 10 |

Tổng cộng: **500 màn / 50 Boss**, trong đó có **5 Grand Boss**.

## 3. Quy ước mỗi lớp

Mỗi lớp gồm **10 Chapter × 10 màn**:

- Level `x1–x9`: dạy/luyện/chuyển giao skill.
- Level `x0`: Boss chữa lành, ôn và kết hợp các skill của 9 màn ngay trước.
- Levels `91–99`: Grand Path — tăng transfer, kết hợp nhiều domain.
- Level `100`: Grand Boss — tổng hợp toàn lớp.

Boss không có health bar. Boss/Guardian bị ảnh hưởng bởi **Đại Lãng Quên** và được phục hồi qua nhiều phase. Thất bại không reset dài; checkpoint theo phase và Oracle mở micro-practice đúng skill còn yếu.

## 4. Gameplay library dùng xuyên suốt

1. **Collect / Count** — chạm, kéo, thu thập đúng số lượng.
2. **Slot Fill** — hoàn thiện bridge/machine/structure bằng phần còn thiếu.
3. **Sorting Stream** — phân loại vật thể theo thuộc tính.
4. **Pathfinding** — chọn/xây đường bằng logic, số lượng hoặc bằng chứng.
5. **Build & Repair** — sửa cầu, cổng, máy, công trình.
6. **Mini Simulation** — thay đổi một biến và quan sát hệ thống.
7. **Visual Matching** — nối cặp quan hệ bằng hình ảnh.
8. **Sequence Puzzle** — sắp xếp số, bước, vòng đời, quá trình.
9. **Observation Hunt** — tìm dấu hiệu trong environment.
10. **Resource Balance** — phân bổ tài nguyên hữu hạn.
11. **Virtual Lab** — thí nghiệm mô phỏng an toàn.
12. **Data Mission** — đọc dữ liệu để ra quyết định.

Mechanic được phép lặp lại, nhưng độ khó phải tăng bằng một hoặc nhiều cách: thêm object/distractor, giảm scaffold, tăng số bước, đổi context, kết hợp skill, yêu cầu tự kiểm tra, hoặc transfer sang tình huống mới.

## 5. Oracle & mastery

Oracle dùng hint ladder:

`Attention cue → Visual highlight → Step-by-step scaffold → Guided completion`

Oracle không nói “Sai”, không đưa đáp án ngay và người chơi luôn thực hiện thao tác cuối cùng.

Mastery không dựa trên thời gian chơi. Tín hiệu chính:

- accuracy;
- first-attempt success;
- số lần thử;
- hint usage;
- khả năng chuyển skill sang mechanic/context khác;
- retention ở session sau.

## 6. Reward loop

Reward ưu tiên một ngôn ngữ thống nhất:

`Hành động đúng → Knowledge Energy → Lõi Tri Thức phản ứng → Environment hồi sinh → milestone/reward ngắn`

Không để màn hình bị quá tải bởi nhiều currency.

## 7. Curriculum safety

Mọi level trong catalog là **game-design mapping**, không phải nguyên văn chuẩn đầu ra chính thức. Khi chuyển sang production data:

```yaml
curriculumApproved: false
source_reference: needs-exact-reference
```

Chỉ đổi thành `true` sau khi đối chiếu objective với chương trình chính thức.

## 8. Schema production đề xuất

```yaml
id: G1-L013
grade: 1
chapter: 2
level: 13
type: normal # normal | boss | grand_boss
skill_ids: [MATH.OP.SUB.G1]
learning_objective_vi: "..."
curriculumApproved: false
mechanic: light_bridge
difficulty: 2
oracle_hint_ladder: [attention, visual, scaffold]
mastery_evidence: [correct_action, attempts, hint_usage, transfer]
reward: knowledge_energy
restoration_target: bridge_sector_02
```

## 9. Definition of Done cho một level production

- Có skill/objective rõ và source reference.
- Kiến thức nằm trong interaction, không chỉ nằm trên câu hỏi.
- Trẻ hiểu mục tiêu bằng visual/voice trong vài giây.
- Có state: `intro → play → feedback → hint → success → restoration → reward`.
- Có 3 mức hint deterministic; Gemini chỉ cá nhân hóa cách hỗ trợ, không tự thay objective.
- Có mastery evidence và replay logic chống farm.
- Boss có checkpoint và practice micro-loop.
- Nội dung sức khỏe, điện, nhiệt, chất, thí nghiệm phải qua safety review.

## 10. Files chi tiết

Bắt đầu từ Lớp 1: [`grade-1.md`](levels/grade-1.md), sau đó progression tăng dần đến Lớp 5: [`grade-5.md`](levels/grade-5.md).
