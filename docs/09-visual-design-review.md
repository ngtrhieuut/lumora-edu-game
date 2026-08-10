# 09 — Visual Design Review v0.1

Ngày review: 2026-08-10  
Nguồn: 25 concept images trong Google Drive folder Lumora.

## Executive summary

Bộ concept đã hình thành một visual language tương đối rõ và từ scene 9 trở đi bắt đầu trông như **cùng một game**. Bốn yếu tố mạnh nhất và nên trở thành signature của Lumora:

1. **Tri thức làm thế giới hồi sinh** — scene 04.
2. **Linh Thú hấp thụ Knowledge Energy** — xuyên suốt gameplay/progression.
3. **Oracle hỗ trợ theo từng nấc, không chấm đúng/sai lạnh lùng** — scene 24.
4. **Evolution cinematic như phần thưởng cho mastery** — scene 20.

Rủi ro lớn nhất hiện tại:

- UI một số màn có quá nhiều currency, level, reward và nút điều hướng.
- Một số mini-game vẫn là bài toán truyền thống đặt trong environment thay vì knowledge nằm trong mechanic.
- Starter creature/Oracle chưa đủ khác biệt để tạo IP riêng; có cảm giác quen thuộc với creature-collection games.
- League và Collection có nguy cơ khiến MVP phình to và kéo game về mô hình retention truyền thống.
- Tên world chưa thống nhất giữa “Rừng Rạng Đông” và “Rừng Thức Tỉnh”.

## Canonical design decisions proposed

### 1. Canonical world name

Dùng **Rừng Thức Tỉnh** cho World đầu tiên trong tài liệu và prototype cho đến khi có quyết định đổi tên chính thức.

### 2. Canonical visual reward language

Một câu trả lời/hành động đúng phải đi theo chuỗi:

`Tương tác đúng → Knowledge Energy xuất hiện → Linh Thú/Lõi Tri Thức phản ứng → Environment hồi sinh → reward ngắn gọn`

Không dùng dấu ✅ lớn làm reward chính.

### 3. UI hierarchy cho trẻ Lớp 1

Mỗi gameplay scene chỉ nên có:

- 1 mục tiêu chính;
- 1 progress indicator;
- tối đa 1 currency visible nếu thật sự cần;
- nút settings/parent bị giảm prominence;
- Oracle xuất hiện contextual, không thường trực.

### 4. MVP progression

MVP không cần hiển thị đầy đủ economy, collection và league cùng lúc.

Ưu tiên:

`World progress → Mastery → Linh Thú evolution → Knowledge City`

Collection và League là secondary/deferred systems.

---

## Scene-by-scene review

Thang đánh giá định tính:
- **Canonical**: có thể dùng làm source of truth cho prototype.
- **Keep**: giữ concept, cần refinement nhỏ.
- **Revise**: hướng đúng nhưng cần thiết kế lại đáng kể.
- **Major revise**: chưa nên build theo ảnh hiện tại.
- **Defer**: không cần trong MVP.

### Scene 01 — UI visual direction
**Status: Revise**

Điểm mạnh:
- Game appeal cao.
- Màu sắc, crystal, Linh Thú và fantasy forest tạo cảm giác game rõ.
- Touch targets lớn.

Vấn đề:
- “Rừng Rạng Đông” không thống nhất với “Rừng Thức Tỉnh”.
- HUD quá nhiều: avatar, level, shards, parent report, bottom nav, nhiều block số học.
- Bài toán vẫn lộ rõ như UI exercise.

Hướng sửa:
- Giảm HUD 30–40%.
- Đưa phép toán thành environmental interaction.
- Dùng scene này như mood reference, không phải layout canonical.

### Scene 02 — World style board
**Status: Keep**

Điểm mạnh:
- Xác định tốt forest/crystal/portal/city/corruption language.
- Có đủ contrast giữa recovered vs forgotten world.

Hướng sửa:
- Chuẩn hóa màu Knowledge Energy và crystal để không mỗi scene dùng một bảng màu khác nhau.

### Scene 03 — World map
**Status: Keep**

Điểm mạnh:
- Vision Lớp 1–5 dễ hiểu mà không cần ghi “Lớp 1, Lớp 2”.
- Có cảm giác hành trình dài hạn.

Hướng sửa:
- Tăng tính liên kết địa lý/lore giữa 5 vùng.
- Các world sau nên bị fog/corruption mạnh hơn để tăng mystery.

### Scene 04 — Restoration language
**Status: CANONICAL**

Đây là một trong những hình mạnh nhất.

Giữ:
- Before/after rõ ràng.
- Knowledge stream kết nối gameplay với environment.
- Reward thay đổi cả thế giới, không chỉ tăng điểm.

Đây nên là **signature promise** của Lumora.

### Scene 05 — Linh Thú silhouettes
**Status: Explore**

Điểm mạnh:
- Đa dạng silhouette.
- Một số form có khả năng phát triển thành IP riêng.

Rủi ro:
- Nhiều silhouette vẫn đọc như fox/deer/dragon/spirit quen thuộc.

Next pass:
- Chọn 4 silhouette ít phụ thuộc động vật thật nhất.
- Thiết kế signature anatomy riêng cho Lumora: Knowledge Core + ear/horn/tail language.

### Scene 06 — 3 starter creatures
**Status: Revise**

Điểm mạnh:
- Personality khác nhau rõ.
- Animation pose tốt.

Vấn đề:
- Starter B khá giống fox mascot truyền thống.
- Starter C quá gần deer/nature spirit.
- Hệ Logic/Khám phá/Tự nhiên dễ bị hiểu giống elemental starters.

Hướng sửa:
- Không gắn starter vào “element class”.
- Personality quyết định lựa chọn ban đầu; learning path không bị khóa theo pet.
- Tăng original anatomy.

### Scene 07 — Evolution line
**Status: Keep direction / Revise form**

Điểm mạnh:
- Evolution moment có sức hút mạnh.
- Final form đủ aspirational.

Vấn đề:
- Hình thái đổi quá xa, từ creature nhỏ sang humanoid guardian.
- Có nguy cơ mất emotional attachment vì người chơi cảm giác thành một sinh vật khác.

Hướng sửa:
- Mỗi stage giữ 2–3 đặc điểm nhận diện cố định: mắt, tai/sừng, đuôi, Knowledge Core.
- Evolution = trưởng thành + rune + silhouette enhancement, không thay species.

### Scene 08 — Oracle
**Status: Revise**

Điểm mạnh:
- Pose/hint/celebration tốt.
- Tone thân thiện.

Vấn đề:
- Oracle quá giống một Linh Thú khác.
- Chưa có silhouette đủ distinct để người chơi nhận biết ngay đây là AI mentor.

Hướng sửa:
- Oracle nên có visual grammar riêng: floating projection/light spirit, ít animal anatomy hơn.
- Giảm text bubble, tăng gesture/voice.

### Scene 09 — First 15-minute storyboard
**Status: CANONICAL FLOW**

Giữ flow:
`Launch → Đại Lãng Quên → chạm Shard → Linh Thú thức tỉnh → Oracle → vào Rừng → puzzle → world restoration → reward → next map → boss tease`.

Điểm cần khóa:
- Interaction đầu tiên < 60 giây.
- Intro cinematic không quá 20–30 giây trước first touch.

### Scene 10 — Home screen
**Status: Revise**

Điểm mạnh:
- CTA “Tiếp tục hành trình” rõ.
- Linh Thú làm focal point.

Vấn đề:
- 5 entry points + currencies + parent + settings hơi nhiều cho trẻ 6 tuổi.

MVP home nên chỉ nổi bật:
1. Tiếp tục hành trình.
2. Linh Thú.
3. Thành phố.

Các feature khác secondary.

### Scene 11 — Adventure map
**Status: Keep**

Điểm mạnh:
- Level gắn với địa danh/environment tốt hơn node map truyền thống.
- Boss visible từ xa tạo anticipation.

Refine:
- Main path phải rất rõ với trẻ chưa đọc tốt.
- Side/secret quest dùng icon/visual cue thay chữ.

### Scene 12 — Collect quantity
**Status: Keep**

Một mechanic MVP tốt vì kiến thức nằm trực tiếp trong interaction.

Refine:
- Không cần hiện “+70 shards, +1 level” cùng lúc.
- Objective nên đọc bằng visual + voice: `0/7` là đủ.

### Scene 13 — Cầu Ánh Sáng
**Status: Keep / Refine**

Điểm mạnh:
- Phép cộng được physicalize thành xây cầu.
- Thành công tạo chuyển động qua vực → reward có ý nghĩa.

Vấn đề:
- Dãy answer tiles phía dưới kéo cảm giác về worksheet.

Refine:
- Cho trẻ kéo trực tiếp số crystal cần thêm từ environment.

### Scene 14 — Đường Đi Rune
**Status: Revise**

Vấn đề chính:
- Các biểu thức hiện ngay trên đường như answer choices; vẫn gần multiple choice.

Hướng tốt hơn:
- Mỗi path có một số vật thể/rune sequence; trẻ suy luận bằng số lượng/pattern và tự chọn đường.
- Equation chỉ xuất hiện ở higher difficulty, không ở entry Grade 1.

### Scene 15 — Suối Sắp Xếp
**Status: Keep / Refine**

Điểm mạnh:
- Sorting phù hợp touch.
- World reacts to correct sorting.

Refine:
- Giảm phụ thuộc text “ít hơn 5/nhiều hơn 5”.
- Dùng cổng có visual icon + narrator voice.

### Scene 16 — Xưởng Hình Khối
**Status: Revise**

Điểm mạnh:
- Shape manipulation phù hợp Lớp 1.

Vấn đề:
- Layout hiện giống bài nhận diện hình hơn là sửa máy.

Refine:
- Một machine/bridge/door thực sự có lỗ khuyết hình học; trẻ drag shape vào để bộ máy hoạt động.
- Labels chỉ hỗ trợ, không phải nhiệm vụ chính.

### Scene 17 — Real-world scenario
**Status: MAJOR REVISE**

Đây là scene yếu nhất trong gameplay batch.

Vấn đề:
- Nhiều người/Oracle/food/text cùng lúc.
- Có cảm giác bài toán story problem được minh họa.
- Human children xuất hiện làm thay đổi visual focus khỏi Linh Thú/world.

Hướng mới:
- Biến thành simulation: chuẩn bị 5 phần ăn cho 5 creature NPC trong environment.
- Không cần câu chữ dài; NPC thể hiện nhu cầu bằng icon.

### Scene 18 — Boss Kẻ Nuốt Con Số
**Status: Keep / Refine**

Điểm mạnh:
- Boss thân thiện, không violence.
- Thanh hồi phục thay health bar là đúng hướng.
- Multi-phase có tiềm năng thành signature demo.

Refine:
- Không để phép toán floating như test.
- Mỗi phase dùng mechanic đã học trước đó.
- Boss body/environment thay đổi rõ qua mỗi phase.

### Scene 19 — Level complete
**Status: Revise**

Điểm mạnh:
- Visual celebration tốt.
- Linh Thú là trung tâm.

Vấn đề:
- Quá nhiều reward/currency/item cùng lúc.

MVP reward screen chỉ nên có:
- mastery star/progress;
- Knowledge Energy;
- 1 meaningful unlock/material.

### Scene 20 — Evolution cinematic
**Status: CANONICAL**

Đây là signature moment mạnh nhất cùng scene 04.

Giữ:
- Shards orbit;
- Knowledge Core ignition;
- rune activation;
- transformation;
- final reveal.

Điều kiện: hình thái mới vẫn phải nhận ra là cùng Linh Thú.

### Scene 21 — Knowledge City
**Status: Keep / Reduce scope**

Điểm mạnh:
- Tạo visualization dài hạn cho mastery.
- Có giá trị với trẻ và phụ huynh.

MVP:
- Chỉ 3–4 building.
- Auto-build/unlock nhiều hơn manual city management.
- Không tạo economy city-builder.

### Scene 22 — Collection
**Status: Revise / Defer**

Vấn đề:
- Layout dễ gợi cảm giác gacha/collection game.
- Không cần để chứng minh core thesis AI Riser.

Nếu giữ sau này:
- Reframe thành **Nhật ký Linh Thú / Khám phá**.
- Unlock qua adventure/mastery, không random draw.

### Scene 23 — League
**Status: DEFER FROM MVP**

Vấn đề:
- UI overloaded.
- Metrics 120%, challenge count, mastery score... quá trừu tượng cho trẻ nhỏ.
- Competition không cần thiết để chứng minh core loop.

Nếu demo, chỉ mock nhẹ ở locked/coming-soon state.

### Scene 24 — Oracle hint flow
**Status: CANONICAL**

Giữ 3-level hint principle:

1. Emotional encouragement / attention cue.
2. Visual highlight.
3. Step-by-step scaffold.

Chỉ sau nhiều lần thất bại mới có guided completion.

Không nói “Sai”. Không đưa đáp án ngay.

### Scene 25 — Parent Dashboard
**Status: Revise**

Điểm mạnh:
- Có learning time, mastery, strengths, areas to practice, trend.
- Narrative insight có giá trị hơn raw score.

Vấn đề:
- Quá nhiều game decoration cho adult dashboard.
- Cần rõ dữ liệu nào là estimated vs measured.

Refine:
- Cleaner adult UI.
- 5 metrics chính.
- Weekly narrative insight.
- Privacy/child safety visible.

---

## MVP visual scope after review

### Must build
- World restoration language — 04.
- First 15-minute flow — 09.
- Simplified Home — 10 revised.
- Adventure map — 11.
- Collect quantity — 12.
- Light Bridge — 13 revised.
- Sorting Stream — 15 revised.
- Shape Workshop — 16 revised.
- Boss — 18 revised.
- Simplified Level Complete — 19 revised.
- Evolution — 20.
- Small Knowledge City — 21.
- Oracle Hint Flow — 24.
- Simplified Parent Dashboard — 25 revised.

### Defer
- Full creature collection — 22.
- League — 23.
- Complex economy/inventory.
- Multiple starter creatures if originality pass is not complete.

## Next design tasks

1. Character originality pass.
2. HUD simplification pass.
3. Gameplay integration pass for scenes 13–17.
4. Lock first 15-minute UX flow.
5. Convert each kept gameplay into interaction/state specification before coding.
