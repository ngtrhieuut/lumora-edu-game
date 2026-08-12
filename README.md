# Lumora — Game giáo dục phiêu lưu cho trẻ em Việt Nam

> **Tên làm việc:** Lumora  
> **Giai đoạn:** Concept / Pre-MVP  
> **Thị trường đầu tiên:** Việt Nam  
> **Ngôn ngữ trải nghiệm người chơi:** Tiếng Việt  
> **Đối tượng MVP:** Học sinh tiểu học, bắt đầu từ Lớp 1  
> **Định hướng:** Mở rộng Lớp 1 → 5, sau đó THCS và THPT.

## 1. Tuyên bố sản phẩm

Lumora không phải là “ứng dụng học tập có gamification”.

Lumora được thiết kế như **một game phiêu lưu thật sự**, có cốt truyện, nhân vật, tiến hóa, vật phẩm, bản đồ, boss, nhiệm vụ và cạnh tranh; trong đó **kiến thức là nguồn sức mạnh giúp người chơi tiến bộ**.

Mục tiêu là tạo ra một lựa chọn giải trí tốt hơn cho trẻ em đang sử dụng điện thoại/tablet để chơi game hoặc xem video ngắn, bằng cách biến thời gian giải trí thành trải nghiệm vừa chơi vừa học nhưng không tạo cảm giác “đang làm bài tập”.

## 2. Vấn đề cần giải quyết

Nhiều gia đình cho trẻ sử dụng điện thoại/tablet khi cha mẹ bận làm việc, ăn uống hoặc cần trẻ tự giải trí. Điều này tiện lợi nhưng thường dẫn đến:
- Chơi game thuần giải trí trong thời gian dài.
- Xem video ngắn, nội dung rời rạc và giá trị giáo dục thấp.
- Screen time tăng nhưng khó đo lường giá trị học tập.
- Trẻ dễ chán các ứng dụng học truyền thống vì thiếu cốt truyện, progression và phần thưởng hấp dẫn.

## 3. Giải pháp cốt lõi

Tạo một game có:
- Gameplay đa dạng, không phải Candy Crush clone.
- Mỗi cấp/lớp là một thế giới phiêu lưu.
- Mỗi màn chơi gắn với một hoặc nhiều năng lực/kiến thức phù hợp với chương trình học tại Việt Nam.
- Học thật → mở khóa thật → nhân vật tiến hóa thật.
- AI trợ giảng thích ứng với lỗi sai và năng lực của từng trẻ.
- Dashboard cho phụ huynh để biến “screen time” thành dữ liệu học tập có ý nghĩa.

## 4. Trụ cột thiết kế

1. **Game-first, Education-under-the-hood**  
   Trẻ muốn chơi vì game thú vị; kiến thức được tích hợp tự nhiên vào gameplay.

2. **Mastery > Time Spent**  
   Không thưởng cho việc online lâu. Thưởng cho việc nắm vững kiến thức.

3. **Progression có ý nghĩa**  
   Nhân vật, trang bị, thành phố và bản đồ phản ánh tiến bộ học tập.

4. **AI thực sự hữu ích**  
   Gemini không chỉ là chatbot; AI phải hỗ trợ giải thích lỗi sai, cá nhân hóa độ khó và tạo trải nghiệm phù hợp.

5. **An toàn & phù hợp trẻ em**  
   Không pay-to-win, không cơ chế gây nghiện bằng thời gian, không leaderboard gây áp lực quá mức.

6. **Vietnam-first**  
   UI, hội thoại, nhiệm vụ và nội dung học cho người chơi sử dụng **tiếng Việt**.

## 5. Vòng lặp game cốt lõi

Khám phá bản đồ  
→ Chọn nhiệm vụ  
→ Chơi mini-game / puzzle  
→ Giải quyết thử thách kiến thức  
→ Nhận Knowledge Shards / XP / vật phẩm  
→ Cường hóa hoặc tiến hóa Linh Thú  
→ Mở khóa chapter / boss / vùng đất  
→ Xây dựng Knowledge City  
→ Quay lại nhiệm vụ tiếp theo.

## 6. MVP AI Riser đề xuất

Không xây toàn bộ Lớp 1–5 trong phiên bản đầu.

**MVP: Lumora — Lớp 1 Demo**
- 1 thế giới hoàn chỉnh ở mức demo.
- 10–12 level.
- 5 nhóm kiến thức/gameplay.
- 1 Boss.
- 1 Linh Thú chính.
- 1 lần tiến hóa.
- AI Oracle dùng Gemini.
- Firebase cho hồ sơ/progression.
- Parent Dashboard.
- Leaderboard dạng League.
- Các thế giới Lớp 2–5 hiển thị khóa để truyền tải tầm nhìn dài hạn.

Xem chi tiết trong [`docs/`](docs/).

## Playable web demo

Repo hiện có một vertical slice playable bằng React + Vite cho `Rừng Thức Tỉnh`.

```bash
npm install
npm run dev
```

First-session continuation trong demo nối mạch `Level 1 → Map card → mechanic intro → Match Level 2 → boss tease → Map`. Intro lấy objective/gesture từ `src/interactionSpecs.js`; các node vẫn dùng Pointer Events với click/keyboard fallback. Boss tease chỉ là tín hiệu lore, không unlock boss, reward hoặc prerequisite.

Để duyệt nhanh nội dung local, mở `http://localhost:5173/`, vào `Mở cài đặt` → `Khu vực phụ huynh` → trả lời `12 × 8 = 96`. Trong báo cáo, `Playtest Lab` mở toàn bộ 12 trạm main quest, gồm collect, match, bridge, path, subtract, sort, shape, rune, scenario, mixed, challenge và boss; preview này không ghi progress, mastery, reward hoặc curriculum approval.

Các phần đã có trong demo:

- 12 trạm Lớp 1 theo data-driven level config, có prerequisite, difficulty, `skillId`, mastery events, objective và cờ `approved: false` rõ ràng.
- Campaign registry tách progression theo World: `Rừng Thức Tỉnh` giữ nguyên 12 trạm playable, dữ liệu cũ tự migrate vào World đầu tiên và World kế tiếp chỉ là preview fail-closed, chưa chứa curriculum giả.
- Từ thẻ chân trời trên bản đồ có thể mở blueprint của World kế tiếp để duyệt lore/pillars; màn hình này chỉ đọc, hiện rõ `WORLD BLUEPRINT · PREVIEW` và không tạo node, reward, progress hay approval.
- 2 Side Quest và 1 Secret Quest tạo nhánh tùy chọn trên bản đồ; chỉ mở sau mechanic liên quan, không chặn main quest, không cấp shard khi replay và mở cosmetic thành tựu riêng.
- 11 kiểu tương tác: thu thập, ghép đôi, xây cầu, nối đường, phép trừ trực quan, sắp xếp, dẫn tuyến tài nguyên, cân bằng môi trường, hình khối, quy luật và mô phỏng chia phần.
- Light Bridge nay là một environmental repair circuit: kéo ba tinh thể vào nhịp cầu, dòng năng lượng chạy tới cổng và Nubi phản hồi bằng aura/particle theo stage; click và keyboard vẫn là fallback.
- Sorting Stream dùng cue kích thước và bờ suối nông/sâu để giảm phụ thuộc vào câu chữ; kéo hạt trực tiếp vào bờ đúng, click và keyboard vẫn là fallback.
- Environmental Restoration `Bến Hạt Trôi` mở rộng kỹ năng so sánh kích thước thành một route puzzle: hạt nhỏ và hạt lớn phải đi qua các tuyến nối tới đúng bờ để khôi phục dòng suối. State finite, deterministic, local-only và không thay thế curriculum approval.
- Environmental Restoration `Vạt Cỏ Đom Đóm` biến quest ghép lượng thành mô phỏng hữu hạn: điều chỉnh Nước và Ánh sáng về dấu mục tiêu bằng drag/tap, phản hồi lệch hướng qua Mạch, rồi ghi dấu vùng sống đã hồi sinh trong Thành phố Tri Thức; không ghi đè Main outcomes.
- Shape Workshop là một cỗ máy sửa chữa môi trường: kéo mảnh tròn, tam giác và vuông vào đúng khe để đánh thức lõi máy; click và keyboard vẫn là fallback.
- Scenario Simulation là một bếp dã ngoại trực quan: kéo đủ 2 phần cho Míu và 3 phần cho Tí vào năm trạm NPC; không dùng story problem dài hay answer tiles.
- First-time flow: intro `Đại Lãng Quên` → hồ sơ trẻ tối thiểu lưu local → chạm Mảnh Tri Thức → bản đồ với callout ký ức đầu tiên → vào node đầu tiên.
- First-session continuation: sau khi hoàn tất `Bãi Hạt Sáng`, Map làm nổi bật `Cổng Ghép Đôi`, mở một mechanic intro ngắn, rồi cho chơi `Match` bằng kéo-thả trước khi hiển thị boss tease không mở khóa.
- Các trò thao tác vật thể (gọi hạt sáng, ghép số, dựng cầu, nối đường, phép trừ, phân loại, hình khối, quy luật và chia phần) hỗ trợ kéo-thả bằng Pointer Events trên chuột/touch; click và keyboard vẫn là fallback.
- Drag feedback chỉ highlight drop zone hợp lệ của token đang kéo; thả đúng có landing pulse ngắn, thả sai không làm thay đổi state hay gọi completion callback.
- `src/interactionSpecs.js` là registry canonical cho 12 node: objective, objects, gesture/drop zones, success/soft-fail, hint ladder, mastery events, animation/audio cue và exit state. Runtime hiển thị gesture hint ngắn từ registry thay vì copy rải trong UI.
- Mixed, Challenge và Boss dùng phase config riêng; Boss `Kẻ Nuốt Con Số` ánh xạ 3 kỹ năng đã học và không bạo lực.
- Chuỗi reward: tương tác đúng → Năng lượng Tri thức → môi trường hồi sinh → phần thưởng.
- XP progression: first-clear cộng XP theo reward và mastery (guided 1 / supported 2 / independent 3); replay không farm XP, còn Mảnh Tri Thức vẫn là phần thưởng riêng.
- Hệ năng lượng prototype bám đúng bốn nhóm của game bible: Logic, Nature, Discovery và Mastery. Main Quest/Side Quest chỉ cấp theo category được gắn trong data; first-clear independent nhận +2, guided/support nhận +1, replay không farm. Nature Energy hiện để dành cho curriculum Khoa học/Tự nhiên đã được duyệt.
- Cộng hưởng Nubi đọc cùng Energy registry: trong lúc chơi Nubi có dải màu theo mạch đang luyện, còn success/restoration tăng lên resonance intensity 2 và hiển thị mạch năng lượng vừa nhận; model thuần `src/nubiResonance.js` fail-closed với type lạ và không thay đổi reward/mastery.
- Nubi có visual signal local `ambient → attention → responding → resonant → recovering`: action, hint, soft-fail, phase complete và success điều khiển beam/burst bounded; sprite alpha giữ margin trong suốt và `prefers-reduced-motion` vẫn tắt animation.
- Nubi runtime dùng sprite RGBA trong suốt, contact shadow và particle/orbit depth cue để nhân vật tách khỏi backdrop mà không dùng lại asset flattened `nubi-hero-v2.png`.
- Home truyền mood/resonance theo chặng kế tiếp vào Nubi; hover, keyboard focus và press tác động lên toàn bộ layered figure để nhân vật có phản hồi nổi bật mà vẫn giữ asset alpha và boundary local-first.
- Khi trẻ đang kéo một token, Nubi có attention cue bounded (core glow, beam, foreground sparks và nhịp nổi nhẹ); cue chỉ phản hồi thao tác, không gợi đáp án.
- Cinematic Evolution dùng cùng `NubiFigure` layered contract với Home/Play/City: silhouette alpha, core flare, orbit, resonance ribbon, signal burst và stage glow không còn bị bỏ qua ở màn tiến hóa.
- Oracle `Mạch` với hint ladder 3 cấp, guided completion và soft-fail không phạt; gợi ý có nhánh theo `errorCode` của thao tác sai rồi fallback về ladder mechanic chung. Nhịp auto-hint thích ứng theo nhóm tuổi và best mastery nhưng không ghi alias/tuổi vào telemetry.
- Oracle `Mạch` có manifestation state machine local (`dormant → materializing → teaching → guiding → celebrating → dissolving`) với lõi, orbit, rune fragments và teaching beam tách lớp; visual intensity chỉ là feedback bounded, không thay đáp án hay curriculum.
- Failure path của gameplay phát `soft-fail` vào Oracle presence thật: Mạch materialize sau thao tác lệch, rồi mới teaching khi auto-hint hoặc trẻ chủ động xin gợi ý.
- Audio provider local-first có gesture gate, mute/effect/narration/volume lưu riêng trên thiết bị, procedural cues dịu cho hint/success và nút `Nghe` ở mọi gameplay. Narration chỉ dùng giọng Việt `localService`; nếu thiết bị không có thì fail-closed và giữ hướng dẫn chữ/`aria-live`.
- `Session Compass` mặc định nhắc nghỉ sau 20 phút hoạt động thực của tab, chỉ hiện ở điểm chuyển cảnh an toàn. Phụ huynh có thể tắt hoặc chọn 10/15/20/30 phút; trạng thái tab lưu bằng `sessionStorage`, preference lưu local riêng và không ảnh hưởng reward/mastery/League.
- Gameplay HUD có focus mode: khi đang chơi, trẻ chỉ thấy mục tiêu/progress của thế giới, một tín hiệu XP và settings; điều hướng map/Nubi/city, session reminder và shard được giữ ngoài luồng thao tác chính.
- Linh Thú `Nubi` dùng sprite alpha riêng, có aura/particle/animation theo trạng thái và đã tách visual category khỏi Oracle.
- Các token cần đặt expose drag affordance rõ ràng qua cursor, focus-visible và trạng thái đang kéo; Pointer Events là primary còn click/keyboard vẫn là fallback.
- Drag sai vùng hoặc bị cancel không tự rơi qua click fallback; chỉ tap/click/keyboard chủ động mới thay thế drag.
- Nubi có 2 hình thái data-driven với sprite alpha riêng: Boss first clear mở `Dẫn Quang`, cinematic biến đổi, rune/vây sáng và stage persistence; Boss replay không kích hoạt lại tiến hóa.
- Thành phố Tri Thức và Parent Dashboard có parent gate cùng learning/gameplay metrics tách riêng.
- `Daily Adventure` tạo phiên luyện tối đa 3 thử thách deterministic từ các mechanic đã mở, luôn ưu tiên kỹ năng mastery yếu nhất và không cho farm shard.
- `Daily Adventure` lưu resume local theo ngày gồm queue, challenge index, kết quả đã hoàn tất và phase; Home cho phép tiếp tục sau khi rời hoặc reload, còn phiên khác ngày tự hết hạn và không thay đổi progress/reward/cloud.
- Main Quest và Side/Secret Quest lưu thêm một active-play draft local-only khi đang chơi: chỉ giữ node/quest hợp lệ, phase kế tiếp và timestamp; reload về Home cho phép `Tiếp tục` hoặc `Bắt đầu lại`, hoàn thành sẽ xóa draft. Board internals, PII, reward và cloud state không nằm trong draft.
- Sau queue replay, `Mạch Ký Ức` mở một discovery activity kéo-thả theo đúng route vừa luyện; hoạt động này chỉ khép phiên và ghi metric local, không cấp shard hoặc mastery.
- Lịch sử hoạt động local ghi thời lượng, mastery, hỗ trợ và first-clear; Parent Dashboard hiển thị phút học 7 ngày, số phiên luyện, điểm mạnh và kỹ năng nên củng cố.
- Daily Adventure có phản hồi kéo-thả trực tiếp trên cả board gameplay và discovery board: target hợp lệ phát sáng khi kéo, landing pulse xuất hiện khi thả đúng, còn tap/keyboard vẫn là fallback.
- Daily Adventure thêm puzzle local-only `Dệt Mạch Năng Lượng`: token ký ức được phân vào đúng lane năng lượng, có action budget, target highlight, landing pulse và click/keyboard fallback trước khi mở `Mạch Ký Ức`.
- Parent Dashboard có “Bằng chứng học tập · chỉ lưu local”: một lượt hoàn tất gần nhất được nối với objective canonical để phụ huynh xem lại mục tiêu, mastery, lượt thử, hỗ trợ và thời lượng; đây không phải chẩn đoán hay curriculum approval.
- Knowledge City có 4 công trình auto-build ở mốc 3/7/9/12 chặng với mastery gate tối thiểu 2 cho nhóm kỹ năng tương ứng; replay có thể nâng best mastery để mở công trình, còn cosmetic không tiêu shard và không thay đổi learning outcome.
- `Liên Minh Mầm Sáng` là League demo mở từ Knowledge City: bảng đồng đội hư cấu, điểm chỉ từ chặng duy nhất + best mastery; replay, shard và thời gian online đều không tăng hạng.
- Profile, progress, Oracle và telemetry đi qua provider boundary local-first; không giả lập Firebase/Gemini hay người chơi thật ở client.
- Cloud contract đã có nhưng mặc định fail-closed: Gemini chỉ được gọi qua server endpoint có parent session; Firebase chỉ được bật với parent-owned auth, Security Rules v2, owner path và retention policy. Campaign state khi sync cũng phải qua world-id allowlist. Không đặt API key Gemini trong client.
- Curriculum validator kiểm tra schema, ID/prerequisite order và nguồn/approval; prototype audit PASS nhưng production release bị chặn có chủ đích cho đến khi cả 12 level có nguồn chính thức và human approval.
- Giao diện responsive, touch target lớn và hỗ trợ `prefers-reduced-motion`.

- First-session bridge: sau onboarding và awakening, một Oracle local ngắn cho phép `Bắt đầu` hoặc `Bỏ qua` rồi tự động vào Level 1 `Bãi Hạt Sáng`; hoàn tất lần đầu quay về Adventure Map.

Kiểm tra bản demo:

```bash
npm test
npm run audit:curriculum
npm run build:demo
# Production build is expected to fail until curriculum is approved:
npm run build
```

Xuất packet review nội dung mà không thay đổi code hoặc tự cấp approval:

```bash
npm run curriculum:review
npm run curriculum:review -- --json
```

Nội dung level hiện là prototype theo game-design outline trong repo, chưa phải curriculum mapping chính thức để phát hành.

### Mastery Arc và kiểm duyệt tương tác

`src/masteryArc.js` là registry local-first nối một `skillId` qua Main Quest, Daily Adventure, Side/Secret Quest và các phase Mixed/Challenge/Boss. Selector deterministic ưu tiên skill yếu, giới hạn theo World playable, và fail-closed với node/quest/world/phase không hợp lệ. Completion ghi `activityId`, context và variant vào local activity history; replay vẫn không farm XP, shard hoặc power.

Parent Dashboard có panel `Một kỹ năng, nhiều cách nhớ` để hiển thị context đã gặp và tín hiệu transfer tối thiểu. Đây là bằng chứng thao tác để phụ huynh xem cùng trẻ, không phải diagnosis, không tự sinh curriculum và không mở World 2.

Các lựa chọn rune đều có cùng drop target `missing`: rune sai vẫn có thể kéo vào cổng để tạo soft-fail, còn click chọn → chạm ô và keyboard vẫn là fallback rõ ràng. Daily Discovery chỉ highlight slot khớp fragment đang chọn. Điều này giữ affordance drag nhất quán trên desktop, touch và keyboard.

## Trạng thái cloud

Demo hiện **không kết nối Firebase hoặc Gemini**. `src/services/cloudContracts.js` chỉ định nghĩa request allowlist, response validation, local fallback, parent-owned sync path và readiness audit để chuẩn bị tích hợp sau này. Parent Dashboard hiển thị trạng thái này công khai; không có API key hay dữ liệu trẻ em được gửi ra ngoài.

### Environmental Restoration · Bến Hạt Trôi

`src/resourceRoutingEngine.js` cung cấp contract fail-closed cho Environmental Restoration: resources, source/destination nodes, connections, capacity, actions và mistakes được normalize immutable. `Bến Hạt Trôi` dùng contract này như Side Quest; drag là thao tác chính, click/keyboard là fallback, completion chỉ ghi quest history local và không ghi đè outcome của Main Quest.

Khi chọn một hạt, `Bến Hạt Trôi` chiếu tuyến hợp lệ ngay trên bản đồ: đường đúng sáng lên, đường còn lại hạ intensity, bờ nhận hợp lệ vẫn có target highlight. Projection chỉ đọc allowlist từ route engine; không làm thay đổi rule/capacity.

### Environmental Restoration · Vạt Cỏ Đom Đóm

`src/environmentRestorationEngine.js` cung cấp contract fail-closed cho hai biến môi trường bounded. `Vạt Cỏ Đom Đóm` là Side Quest đầu tiên dùng mô phỏng cân bằng: mỗi dụng cụ chỉ nhận đúng nguồn, action budget và max uses được giới hạn, state không chứa PII/raw answer. Completion mở entry `Vạt Cỏ Đom Đóm hồi sinh` trong Knowledge City; browser đã kiểm tra pointer drag desktop, viewport `390×844` không overflow và city log giữ lại sau reload.

### Daily Adventure · Dệt Mạch Năng Lượng

`src/dailyWeaveEngine.js` thêm một lớp puzzle riêng cho vòng luyện tập: queue deterministic được ánh xạ thành token và lane theo `ENERGY_TYPES`, capacity/action budget được clamp fail-closed, state immutable và không lưu raw answer/PII. `DailyWeaveView` dùng drag Pointer Events làm cử chỉ chính, chạm/chọn rồi chạm lane và keyboard fallback; hoàn tất puzzle chỉ mở `Mạch Ký Ức`, không tạo mastery, shard, XP farm hay curriculum approval mới. Browser đã kiểm tra flow thật qua queue replay, drag desktop/mobile, screenshot `artifacts/daily-weave-desktop.png` và `artifacts/daily-weave-mobile.png`.

### Environmental Restoration · City world-state projection

### Oracle support loop · Daily Weave và Discovery

`OracleSupportDock` dùng chung visual contract Mạch cho Main Quest, `DailyWeaveView` và `PracticeDiscoveryView`. Các lỗi `wrong-lane`, `full`, `max-actions`, `wrong-slot` và `no-selection` đi qua `soft-fail → materializing → teaching`; hint tăng dần bằng local rule-based provider, không gọi Gemini và không tự đặt token. Hai hoạt động vẫn giữ drag/click/keyboard fallback, không ghi mastery, reward, XP, curriculum hoặc cloud; completion đi qua `level-success → dissolving` trước khi kết thúc phiên.

`src/restorationProjectionEngine.js` chuyển `questState.completedIds` thành projection local-first immutable cho Knowledge City. Mỗi vùng có cue hình ảnh bounded (`firefly-grove` hoặc `river-bank`), trạng thái `dormant/restored` và energy type allowlist; City hiển thị cảnh trước/sau thật thay vì chỉ thêm một dòng nhật ký. Nubi đọc các mạch đã hồi sinh ở ambient intensity để có glow/orbit phù hợp, không tạo reward, mastery, XP hoặc cloud write mới. `RestorationView` cũng nói rõ vùng nào vừa hồi sinh sau Side Quest.
### C13 · Play Nubi prominence

Play signal dùng Nubi figure lớn hơn và aura radial trên Main Quest, Quest Play và Practice Play; reduced-motion giữ static feedback nhưng ẩn beam/burst/wave chuyển động.
### C14 · Mobile Nubi composition

Restoration, City và Practice đã dành vùng nhìn thấy rõ hơn cho Nubi trên mobile; Evolution reduced-motion giữ target sprite ở lớp trên và không làm thay đổi luật chơi.
### C15 · Home mobile effect bounds

Home mobile giữ Nubi, aura và focus feedback trong scene bounds; không còn đẩy figure ra ngoài cạnh phải gây cắt hiệu ứng.
### C16. Optional quest curriculum and registry hardening

The three optional quests now carry the same curriculum fields as the 12 Main nodes: grade, subject, domain, skill, objective, difficulty, runtime template, prototype source and explicit approval state. They remain prototype content until a human reviewer adds official source evidence.

`auditOptionalQuestRegistry()` and the curriculum CLI now validate World ownership, Main-node prerequisites, route/restoration scenario back-links, Knowledge City restoration features and quest cosmetic unlocks. Prototype audit passes with `12 nodes, 3 optional quests`; production audit remains intentionally blocked with `0 approved` and `45` missing approval/source-evidence errors.

### C17. Awakening feedback loop

The first onboarding touch now has a visible response: touching the Knowledge Shard puts Nubi into a short resonant state, then continues to the first-session Oracle. The effect reuses the transparent canonical Nubi figure and existing signal layers; it does not add a new mascot asset or alter progress, reward, mastery, curriculum or cloud boundaries. The shard is disabled during the transition and reduced-motion keeps the state change while disabling animation.

### C18. Practice resonance context

Practice Intro, Daily Weave and Discovery now feed their canonical active energy types into Nubi's layered figure. The companion's resonance color follows the current local learning thread instead of showing a neutral idle state; gameplay controls, drag/click/keyboard fallback and all progress/reward/curriculum/cloud boundaries remain unchanged.

### C19. Scenario world-action loop

`ScenarioBoard` now makes the campfire simulation read as a live world action: one waiting friend is marked `Đến lượt`, later stations stay visibly queued, each accepted portion lights one progress dot, and the served station briefly responds with a success pulse. The callout updates after each delivery so the child can see who is calling next. Tap/select and Pointer drag fallback remain available, while the canonical 2-part Míu + 3-part Tí engine contract is unchanged. Browser evidence: `artifacts/c19-scenario-before.png`, `artifacts/c19-scenario-after-one.png` and `artifacts/c19-scenario-mobile.png`.

### C20. Rune environmental gate

`RuneBoard` now presents the missing pattern as a gate in the environment: the forest callout explains the active need, the child can select a rune then tap the missing slot or drag directly, wrong placement briefly marks the gate, and a correct crystal opens a bounded resonance state before navigation. The pattern rule, `wrong-pattern`/`no-selection` feedback and curriculum/runtime boundaries remain unchanged. Browser evidence: `artifacts/c20-rune-before.png`, `artifacts/c20-rune-wrong.png`, `artifacts/c20-rune-correct.png` and `artifacts/c20-rune-mobile.png`.

### C21. Shape repair and Boss energy handoff

`ShapeBoard` now has a clear repair loop: one slot is `Đến lượt`, later slots are queued, each repaired module lights a progress dot and briefly hands energy into the machine core. Tap/select fallback and Pointer drag use the same placement contract. Boss phase completion now holds a bounded `Lõi đang nhận ánh sáng` state before advancing, so the previous mechanic visibly feeds the next phase without changing `completeBossPhase`, phase order, telemetry, progress, reward or curriculum boundaries. Browser evidence: `artifacts/c21-shape-before.png`, `artifacts/c21-shape-landed.png`, `artifacts/c21-boss-handoff.png` and `artifacts/c21-boss-mobile.png`.

### C22. Match pairing circuit

`MatchBoard` now marks one group as `active`, later groups as `queued` and matched groups as a completed circuit. After an accepted drag or select-then-tap pairing, the group and energy tethers pulse briefly before the existing completion callback; wrong/no-selection behavior, the three-pair rule, Pointer drag and click/keyboard fallback remain unchanged. Browser evidence: `artifacts/c22-match-before.png`, `artifacts/c22-match-landed.png` and `artifacts/c22-match-mobile.png`.

### C23. Nubi cutout signal and board step feedback

`NubiFigure` now declares its transparent runtime cutout and asset identity, keeps the image layer explicitly background-free, and adds a visible corona/panel glow during responding or resonant signals. `PathBoard`, `CollectBoard` and `BridgeBoard` now show which step is active, which steps are queued and which step just handed light forward. Correct landings pulse the local slot/core/river; dormant Collect seeds are intentionally click-only so drag affordance does not promise an invalid target. Existing engines, error codes, drag/tap/keyboard fallback, progress and reward boundaries remain unchanged. Evidence: `artifacts/c23-nubi-signal.png`, `artifacts/c23-path-landed.png` and `artifacts/c23-collect-landed.png`.

### C24. Step feedback cho phép trừ và phân loại

`SubtractBoard` và `SortBoard` nay có active/queued state, landing pulse, soft-fail cục bộ và một khoảng handoff ngắn trước khi completion. Đom đóm vẫn nhận kéo/thả vào tổ; pebble vẫn nhận kéo trực tiếp tới bờ đúng hoặc select-then-tap. Các rule canonical, error contract, click/keyboard fallback, progress/reward và curriculum/cloud boundaries không đổi. Browser evidence: `artifacts/c24-subtract-landed.png`, `artifacts/c24-sort-landed.png`; mobile `390×844` không có horizontal overflow.

### C25. Nubi floating companion và drop tether

Nubi trong Play không còn nằm trong một pill nền tối: sprite RGBA được đặt trên floating stage riêng, có contact ground/orbit, còn copy trạng thái nằm ở surface phụ bên cạnh. Khi một token đang kéo và drop target hợp lệ được hover, tether beam nối từ Nubi về vùng board, stage và copy cùng tăng signal; rule drag/click/keyboard, allowlist, phase, reward và curriculum/cloud boundaries giữ nguyên. Browser evidence: `artifacts/c25-nubi-floating-desktop.png`, `artifacts/c25-nubi-floating-mobile.png`; mobile `390×844` vẫn không overflow.

### C26. Practice Nubi tether và C27. Rune drag parity

Daily Weave và Discovery dùng cùng affordance tether: khi token đang kéo qua drop zone hợp lệ, Nubi có signal hướng về lane/slot; mobile chuyển tether thành trục dọc để không che board. `RuneBoard` cũng đưa cả `leaf`, `sun` và `crystal` qua cùng drop target `missing`; rune sai đi vào `wrong-pattern` soft-fail thay vì bị biến thành click-only. Click/keyboard fallback, reduced-motion, rule pattern, reward, mastery, progression và curriculum/cloud boundaries không đổi. Browser QA localhost xác nhận Daily Weave và Discovery drag thật, landing state và mobile `390×844` không overflow; `src/nubiVisual.test.js` và `src/runeVisual.test.js` là focused contracts.

### C28. Prototype sắp xếp thứ tự trong Playtest Lab

Playtest Lab có thêm `Dòng Ký Ức`, một prototype local-only để duyệt mechanic “sắp xếp thứ tự”. Ba token được xáo trộn trong bank; kéo token tới ô trống, chọn token rồi chạm ô hoặc dùng keyboard đều đi qua cùng `src/orderEngine.js`. Đặt sai thứ tự tạo soft-fail bounded; đặt đúng hiển thị active/queued/filled/landed feedback rồi mới kết thúc.

### C29. Prototype registry và Nubi edge cue

`prototype-order` nay nằm trong `src/prototypeNodes.js` và có interaction contract riêng cho drag/tap/keyboard, nhưng vẫn tách khỏi 12 Main Quest nodes và mọi progress/reward/curriculum production state. Nubi tiếp tục dùng sprite RGBA trong suốt; lớp `nubi-cutout-edge` làm silhouette rõ hơn trên nền sáng, còn `attention`/`recovering` có cue corona/core bounded. Chi tiết review nằm trong `docs/13-prototype-order-and-nubi-polish.md`.

Prototype này không nằm trong 12 Main Quest nodes, không ghi progress/mastery/reward/XP, không mở curriculum và không gọi cloud. Production audit vẫn fail-closed cho tới khi có curriculum evidence chính thức và human approval.

### C30. Pairwise comparison prototype và Nubi halo correction

Playtest Lab nay có thêm `Hai Bờ Kích Thước`, một prototype local-only để duyệt model so sánh từng cặp lớn hơn/nhỏ hơn. Mỗi lượt chỉ có một cặp, kéo hạt vào ô `Lớn hơn`/`Nhỏ hơn`; chọn rồi chạm và keyboard/native button là fallback. Sai tạo `compare-mismatch` soft-fail, đúng chuyển sang cặp kế tiếp, đủ ba cặp mới kết thúc.

Prototype này bổ sung khoảng trống giữa `sort` (phân loại nhiều hạt) và `order` (sắp xếp trình tự), nhưng không được đưa vào 12 Main Quest nodes, progress, mastery, reward, XP, persistence, cloud hay production audit. Đồng thời giảm opacity của hai lớp mask full-body của Nubi để giữ silhouette rõ mà không tạo cảm giác một background toàn thân. Chi tiết: `docs/14-prototype-compare-pair.md`.

### C31. Prototype nhận biết số và Nubi presentation

Playtest Lab nay có thêm `Gọi Tên Số`, một prototype local-only cho mục tiêu đếm nhóm hạt rồi chọn chữ số tương ứng. Ba round bounded dùng nhóm 3, 5 và 7 hạt; Pointer drag là primary, select-then-tap/native button/keyboard là fallback; sai tạo `wrong-numeral` soft-fail và đúng mới chuyển lượt.

Model này lấp khoảng trống riêng của outline `Khởi động — nhận biết số`, không đồng nhất với `collect` (đếm hạt) hay `match` (ghép số với nhóm). Prototype không vào 12 Main Quest nodes, progress, mastery, reward, XP, persistence, cloud hay production audit. Chi tiết: `docs/15-prototype-numeral-recognition.md`.

### C32. First-session numeral bridge và Nubi presence

Flow onboarding mới nối `Oracle → Gọi Tên Số → Bãi Hạt Sáng`, tận dụng `prototype-numeral` nhưng giữ local-only, `approved: false`, `reward: 0`; hoàn tất prototype chỉ chuyển sang `collect`, không ghi progress/mastery/XP/reward/cloud/approval. Nubi được tách sprite vào `.nubi-character`, hạ mask full-body và ambient field để alpha cutout đọc độc lập; core/corona/beam chỉ nổi bật khi có signal hoặc đang kéo token. Chi tiết: `docs/16-first-session-numeral-and-nubi-presence.md`.
