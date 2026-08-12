# Lumora — Code Alignment Audit & 500-Level Integration Plan

**Audit target:** `agent/lumora-prototype-review` @ `ee17349165a0914c8081717e533e4970258e9d7a`  
**Design/curriculum source of truth:** `main` @ `e98e736c81646e86c5bc01abbad2d22f8ca9dd92`  
**Status:** implementation-alignment review v0.1

## 1. Executive summary

Prototype hiện tại đã có nền tảng kỹ thuật tốt: React/Vite, nhiều engine thuần tách khỏi UI, test khá dày, curriculum safety gate, local-first provider boundaries, Oracle fallback, mastery/progress, restoration, Nubi, Knowledge City, practice và boss mechanics. Đây là nền tảng nên **giữ lại và tiến hóa**, không nên rewrite từ đầu.

Tuy nhiên code hiện được tối ưu cho một vertical slice khoảng 12 node Lớp 1, trong khi product direction mới đã mở rộng thành **5 lớp × 100 level = 500 level**, mỗi lớp có 10 chapter, boss ở 10/20/.../90 và Grand Boss ở level 100. Vì vậy thay đổi quan trọng nhất không phải thêm 500 case vào `App.jsx`, mà là dựng **data boundary + mechanic registry + chapter/grade campaign model** để runtime đọc level config.

### Kết luận ưu tiên

1. **Giữ các engine pure + test hiện có.**
2. **Tách `App.jsx` thành feature/screen/runtime layer.**
3. **Không dùng `gameData.js` làm nơi hard-code 500 level.** Thay bằng `src/levelCatalog/`.
4. **Nâng campaign model từ `world -> flat nodeIds -> one boss` thành `grade/world -> 10 chapters -> 100 levels -> chapter bosses + grand boss`.**
5. **Tách mechanic contract khỏi learning content.** `interactionSpecs` nên là renderer contract; level config cung cấp objective, target, difficulty, story và hint context.
6. **Giảm vai trò generic XP.** Canonical progression mới dùng Knowledge Energy + Knowledge Shard milestone + world restoration + mastery.
7. **League/optional metagame không được chặn core campaign.** Giữ sau feature flag.
8. **Oracle/Firebase hiện mới ở provider boundary.** Tích hợp thật sau khi core level runtime ổn định; fallback local phải luôn tồn tại.
9. **Không đánh dấu 500 level là curriculum approved.** Giữ human-review gate.

---

## 2. Những gì code hiện tại đang làm đúng

### 2.1. Engine tách khỏi UI

Các module như `gameEngine`, `campaignEngine`, `curriculumEngine`, `energyEngine`, `bossRestorationEngine`, `cityEngine`, `questEngine`, `parentInsights` và nhiều mechanic engine là pure-function oriented. Đây là hướng đúng để scale nội dung.

**Giữ nguyên nguyên tắc:** UI không sở hữu business rules; storage/provider không được chui vào mechanic engine.

### 2.2. Test coverage theo engine

Repo có test riêng cho hầu hết engine và cả visual/runtime contracts. Khi đưa 500 level vào, nên tiếp tục kiểm thử **schema/data contracts** thay vì viết 500 test UI riêng.

### 2.3. Curriculum safety gate

`curriculumEngine` đã có tư duy đúng: prototype content không tự biến thành official curriculum; production release cần explicit approval/source evidence. Đây phải tiếp tục là hard gate.

### 2.4. Oracle có fallback deterministic

Local rule-based Oracle hiện phù hợp làm fallback và giúp gameplay không phụ thuộc network/model. Khi thêm Gemini, nên dùng hybrid provider thay vì thay thế local fallback.

### 2.5. Cloud provider boundaries đã được chuẩn bị

`cloudContracts` đã có contract cho server-mediated Gemini và Firebase sync, không cho client API key. Kiến trúc này phù hợp child safety hơn việc gọi Gemini trực tiếp từ browser.

### 2.6. Restoration + Nubi + mastery đã hiện diện trong runtime

Đây là ba hệ thống phù hợp North Star của Lumora và nên trở thành **shared completion pipeline** cho mọi level:

`Interaction -> learning evidence -> Knowledge Energy -> Nubi/Core response -> restoration -> concise reward -> next level`.

---

## 3. Những nội dung cần chỉnh sửa

## P0 — Bắt buộc trước khi đưa 500 level vào app

### 3.1. `App.jsx` đang quá lớn

Hiện `App.jsx` là integration shell hàng nghìn dòng và import gần như mọi engine trực tiếp. Nếu thêm 500 level bằng pattern hiện tại, file sẽ trở thành bottleneck lớn nhất.

**Cần chuyển dần sang:**

```text
src/app/
  AppShell.jsx
  routes/
  screens/

src/features/
  adventure/
  gameplay/
  oracle/
  restoration/
  city/
  parent/

src/runtime/
  LevelRuntime.jsx
  mechanicRenderers/
```

`App.jsx` cuối cùng chỉ nên compose providers/router/shell.

### 3.2. `gameData.js` đang hard-code vertical slice 12 node

Current node model phù hợp demo nhưng không phù hợp 500 level. Không mở rộng `nodeDefinitions` thành array 500 object trong file này.

**Hướng mới:**

```text
src/levelCatalog/
  schema.js
  mechanicRegistry.js
  grade1.js
  grade2.js
  grade3.js
  grade4.js
  grade5.js
  index.js
  validate.js
```

`gameData.js` sau này chỉ nên chứa canonical world metadata, Nubi/city shared config, hoặc được chia nhỏ thành registries.

### 3.3. Campaign model chỉ hỗ trợ một boss/world

Hiện campaign validation yêu cầu playable world có `bossNodeId`. Cấu trúc 500 level cần:

```text
Grade/World
  Chapter 1 -> L1..L10 -> Chapter Boss
  ...
  Chapter 9 -> L81..L90 -> Chapter Boss
  Chapter 10 -> L91..L100 -> Grand Boss
```

Cần model mới:

```js
{
  worldId,
  grade,
  chapters: [
    { chapter: 1, levelIds: [...], bossLevelId: "g1-l010" },
    ...
  ],
  grandBossLevelId: "g1-l100"
}
```

Không dùng một `bossNodeId` để đại diện cả grade.

### 3.4. Level unlock không nên phụ thuộc flat global array

`isNodeUnlocked` hiện dựa trên prefix hoàn thành của `orderedNodeIds`. Với 500 level, cần explicit prerequisites từ config để:

- đổi thứ tự level mà không corrupt save;
- thêm side/secret quest;
- cho boss yêu cầu chapter prerequisites;
- hỗ trợ future adaptive route.

**Rule mặc định:** main campaign vẫn tuần tự, nhưng runtime đọc `level.prerequisites` thay vì suy từ vị trí array.

### 3.5. Tách mechanic khỏi content

`interactionSpecs` hiện vừa mô tả mechanic vừa hard-code một objective/context cụ thể như 5 hạt, 7 nhịp cầu, 6 đom đóm...

500 level cần:

```text
Mechanic contract
+ Level parameters
= Playable level instance
```

Ví dụ:

```js
mechanic = "slot-fill"
params = {
  totalSlots: 9,
  occupiedSlots: 5,
  draggableCount: 4,
  distractors: 1
}
```

Renderer không cần biết level 12 hay level 237.

### 3.6. Bổ sung mechanic families cho Lớp 3–5

Runtime hiện mạnh ở drag/drop math prototype nhưng thiếu renderer canonical cho:

- `observation`
- `lab`
- `data`
- `resource-balance` tổng quát
- `sequence` tổng quát
- simulation nhiều biến

Không viết riêng engine cho mỗi level; viết renderer/engine theo **family**.

---

## P1 — Chỉnh progression để đúng Game Design Bible

### 3.7. Generic XP đang trùng vai trò với Knowledge Energy

Current `gameEngine` có `xp`, `shards`, `energies` đồng thời. Design direction ban đầu muốn economy đơn giản.

**Đề xuất:**

- Level mới trong 500 catalog: `xp = 0`.
- `Knowledge Energy`: progression thường xuyên/mastery feedback.
- `Knowledge Shard`: chapter/grand milestone.
- Discovery/cosmetic item: optional reward.

Giữ field XP tạm thời để backward compatibility với save v1/v2, nhưng UI mới không phụ thuộc XP.

### 3.8. Evolution không nên chỉ xảy ra vì clear boss

Current `recordLevelResult` có shortcut boss -> `nubiStage = 2`.

Nên đổi sang evolution gate dựa trên:

- milestone boss;
- mastery threshold;
- skill coverage;
- Knowledge Core charge.

Boss có thể là **một điều kiện**, không phải điều kiện duy nhất.

### 3.9. Nubi evolution hiện mới 2 stage

Prototype có thể giữ 2 stage, nhưng data model dài hạn nên cho 5 stage và không hard-code clamp `1..2` trong progress migration.

### 3.10. Boss cần chapter context

Boss engine hiện dùng tốt cho multi-phase recovery. Cần thêm metadata:

- `kind: chapter | grand`
- `reviewLevelIds`
- checkpoint per phase
- weak-skill micro-practice
- không reset toàn boss

500-level catalog mới đã khai báo những field này.

---

## P1 — UX/Product scope

### 3.11. League đã code nhưng không phải core MVP

League hiện privacy-safe/local demo, nhưng product review trước đó đã xác định League là secondary/deferred. Không xóa engine; đặt sau feature flag/secondary navigation và không để reward League ảnh hưởng campaign power.

### 3.12. Daily Weave / Practice / Discovery là hệ secondary

Các engine này có giá trị retention và mastery, nhưng main campaign 500 level phải là spine. Không để child first-session hoặc core navigation bị chia quá nhiều entry point.

### 3.13. Knowledge City phải phản ánh mastery, không thành city economy

Giữ city projection/building unlock từ mastery/restoration. Tránh thêm resource farming, timers, queue xây dựng hay economy riêng.

### 3.14. First-session prototype phải trở thành onboarding layer

Các module first-session rất hữu ích cho demo. Khi campaign 500 level xuất hiện, onboarding nên kết thúc bằng việc mở `g1-l001`, thay vì tồn tại như một campaign song song khó đồng bộ.

---

## P1 — Gemini / Firebase

### 3.15. Oracle chưa phải Gemini thật

Hiện local rule-based Oracle là fallback. `cloudContracts` đã có server contract nên bước production cần:

1. server endpoint;
2. request allowlist từ level catalog;
3. validate Gemini structured output;
4. timeout -> local fallback;
5. không gửi PII của trẻ.

### 3.16. Progress chưa sync Firebase

Current store là localStorage. Khi tích hợp Firebase:

- parent-owned auth/session;
- child profile không cần email;
- lưu aggregate mastery + progress;
- version save schema;
- migration từ current local save;
- offline-first nhưng có explicit trusted-device policy nếu dùng persistent cache.

---

## P2 — Maintainability

### 3.17. `styles.css` cần modularize

CSS rất lớn. Khi thêm 12 mechanic families và 5 worlds, nên tách:

```text
styles/
  tokens.css
  shell.css
  gameplay.css
  oracle.css
  restoration.css
  responsive.css
```

hoặc CSS modules theo feature.

### 3.18. Registry thay cho switch/conditional theo level id

Runtime phải chọn renderer bằng `mechanicId`, không bằng `level.id`.

Mục tiêu:

```js
const Renderer = mechanicRenderers[level.mechanicId];
return <Renderer level={level} />;
```

### 3.19. Save schema cần version mới

500 level tạo nhiều node hơn current progress. Nên thêm:

```js
schemaVersion: 3
activeGrade
activeWorldId
activeLevelId
chapterProgress
```

và migration test.

### 3.20. Test strategy

Không tạo 500 DOM tests. Dùng:

- catalog structural validation;
- mechanic renderer tests;
- representative level fixtures per difficulty;
- boss cadence tests;
- progression migration tests;
- integration smoke cho một chapter/grade.

---

## 4. Kiến trúc đích đề xuất

```text
src/
  app/
  features/
  runtime/
    LevelRuntime.jsx
    mechanicRenderers/
      CollectRenderer.jsx
      SlotFillRenderer.jsx
      SortRenderer.jsx
      PathRenderer.jsx
      BuildRepairRenderer.jsx
      SimulationRenderer.jsx
      MatchRenderer.jsx
      SequenceRenderer.jsx
      ObservationRenderer.jsx
      ResourceBalanceRenderer.jsx
      LabRenderer.jsx
      DataRenderer.jsx
      BossRenderer.jsx

  levelCatalog/
    README.md
    schema.js
    mechanicRegistry.js
    grade1.js
    grade2.js
    grade3.js
    grade4.js
    grade5.js
    index.js
    validate.js
    levelCatalog.test.js

  engines/
  services/
```

Không cần di chuyển toàn bộ engine ngay. Có thể refactor theo từng feature để giảm rủi ro.

---

## 5. Contract cho một level mới

Một level config phải chứa ít nhất:

```js
{
  id: "g1-l012",
  grade: 1,
  worldId: "forest-awakening",
  chapter: 2,
  order: 12,
  type: "standard",
  titleVi: "...",
  skillId: "...",
  learningObjectiveVi: "...",
  mechanicId: "slot-fill",
  difficulty: {...},
  oracle: {...},
  mastery: {...},
  rewards: {...},
  restoration: {...},
  prerequisites: ["g1-l011"],
  curriculum: { approved: false, ... }
}
```

Các giá trị cụ thể của board/object/target nên đi vào mechanic parameters ở refinement pass tiếp theo; không hard-code vào renderer.

---

## 6. 500-level package được thêm trong commit này

Folder mới `src/levelCatalog/` chứa:

- 5 file grade, **100 explicit configs/file**;
- tổng đúng **500 level**;
- chapter boss ở 10/20/.../90;
- Grand Boss ở 100;
- prerequisite chain;
- mechanic family;
- learning objective;
- Oracle policy;
- mastery evidence;
- Knowledge Energy / Knowledge Shard reward;
- restoration metadata;
- curriculum source trace về `main`;
- validation + test.

### Quan trọng

Đây là **content/config layer**, chưa có nghĩa cả 500 level đã render/playable. Các mechanic đã có prototype runtime có thể adapter trước; `lab`, `data`, `observation` cần renderer mới. Đây chính là mục đích của tách data: thêm renderer một lần, sau đó hàng chục level cùng family dùng lại được.

---

## 7. Thứ tự refactor khuyến nghị

1. Merge/rebase curriculum + 500-level docs từ `main` vào code branch.
2. Giữ `src/levelCatalog/` làm canonical content API.
3. Viết `LevelRuntime` + mechanic registry adapter.
4. Cho `g1-l001..g1-l010` chạy bằng runtime mới.
5. Chuyển first-session để handoff sang `g1-l001`.
6. Nâng campaign engine sang chapter/grade model.
7. Chuyển save schema/migration.
8. Sau khi Lớp 1 chapter 1 ổn mới mở rộng renderer families.
9. Gemini/Firebase thật sau khi runtime contract ổn định.
10. League/Daily/secondary systems bật lại qua feature flags sau core campaign.

## 8. Definition of Done cho integration phase tiếp theo

- Có thể gọi `getLevelById("g1-l001")` và render đúng mechanic.
- Clear level ghi mastery/restoration và mở prerequisite kế tiếp.
- Level 10 chạy Boss multi-phase và không reset toàn boss nếu một phase sai.
- Level 11 chỉ mở sau chapter boss 10.
- Catalog audit trả về `500 / valid`.
- Không cần sửa `App.jsx` khi thêm một level mới cùng mechanic family.
- Không có generic XP requirement trong level catalog mới.
- Production build vẫn block curriculum chưa human-approved.
