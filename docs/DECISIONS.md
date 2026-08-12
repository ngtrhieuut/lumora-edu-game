# Decision Log

## 2026-08-11 — Mastery Arc nối nhiều ngữ cảnh
**Decision:** Xây `src/masteryArc.js` làm lớp registry/policy dùng chung cho Main Quest, Daily Adventure, Side/Secret Quest và phase Mixed/Challenge/Boss. Mỗi activity giữ canonical `skillId`, context, variant, prerequisite và `worldId`; selector local deterministic ưu tiên skill yếu, không nhận PII và không tự sinh curriculum.

**Boundary:** First-session target và Daily queue có thể đọc policy này, nhưng nó không tự mở node, không cấp first-clear reward, không biến replay thành XP/shard farm và không mở World 2. Parent Dashboard chỉ hiển thị context đã gặp như evidence thao tác, không gọi đó là diagnosis hay curriculum approval.

**Interaction correction:** `DragToken` có allowlist rỗng sẽ trở thành click-only; Discovery fallback chỉ highlight slot hợp lệ. Nubi vẫn dùng PNG RGBA transparent, silhouette rim bám alpha, halo ambient thu hẹp và contact shadow căn theo visible feet.

**Verification:** `src/masteryArc.test.js` bao phủ registry context, fail-closed unknown/preview source, deterministic first-session/daily selection, world isolation và transfer evidence. Full `npm test` pass `257/257`; `npm run build:demo` pass với curriculum prototype `12 nodes, 0 approved, 0 errors, 24 warnings` và Vite `51 modules`. Production build tiếp tục bị chặn có chủ đích bởi official curriculum evidence/human approval.

## 2026-08-10 — Game-first
**Decision:** Lumora phải được thiết kế như game thật, không phải quiz app có gamification.

## 2026-08-10 — Vietnam-first
**Decision:** Ngôn ngữ player-facing là tiếng Việt.

## 2026-08-10 — Diverse gameplay
**Decision:** Không clone Candy Crush; dùng nhiều mini-game/puzzle mechanics.

## 2026-08-10 — MVP focus
**Decision:** Prototype đầu tiên tập trung Lớp 1, khoảng 10–12 level thay vì xây Lớp 1–5 ngay.

## 2026-08-10 — Progression through mastery
**Decision:** Evolution và reward ưu tiên dựa trên mastery/challenge, không time played.

## 2026-08-10 — Google integrations
**Decision:** Gemini Oracle + Firebase là hai tích hợp Google nền tảng cho MVP.

## 2026-08-10 — Canonical first world name
**Decision:** Dùng tên **Rừng Thức Tỉnh** cho World đầu tiên trong prototype và tài liệu cho đến khi có quyết định đổi tên chính thức. Không dùng song song “Rừng Rạng Đông”.

## 2026-08-10 — World restoration as signature reward
**Decision:** Chuỗi visual reward chuẩn là `tương tác đúng → Knowledge Energy → Lõi Tri Thức/Linh Thú phản ứng → môi trường hồi sinh → reward`. Dấu đúng/sai không phải feedback chính.

## 2026-08-10 — First-touch target
**Decision:** Người chơi phải có tương tác đầu tiên trong vòng tối đa 60 giây; mục tiêu tốt là 30–45 giây.

## 2026-08-10 — Simplified child HUD
**Decision:** MVP giảm mạnh HUD/currency. Một gameplay screen ưu tiên 1 mục tiêu, 1 progress indicator và tối đa 1 currency visible nếu thật sự cần.

## 2026-08-10 — Oracle hint ladder
**Decision:** Oracle sử dụng hint theo nấc: attention cue → visual scaffold → step-by-step → guided completion. Không nói “Sai” và không đưa đáp án ngay.

## 2026-08-10 — MVP metagame scope
**Decision:** Knowledge City giữ ở dạng nhẹ; full Creature Collection và League được defer khỏi core MVP. MVP ưu tiên World Progress → Mastery → Evolution → Knowledge City.

## 2026-08-10 — Character originality pass required
**Decision:** Starter Linh Thú và Oracle hiện chỉ là concept direction, chưa canonical. Cần originality pass để giảm cảm giác fox/deer/Pokémon-like và tạo signature anatomy riêng cho Lumora.

## 2026-08-10 — Prototype character direction
**Decision:** Bản web vertical slice dùng `Nubi` làm tên prototype cho Linh Thú Mầm Sáng và `Mạch` làm tên prototype cho Oracle. Nubi là một sinh vật mềm có ba vây và Lõi Tri Thức nằm trong anatomy; Mạch là một floating construct gồm lõi và các mảnh rune quay quanh, không phải một Linh Thú thứ hai.

**Scope:** Đây là quyết định phục vụ prototype, chưa thay thế originality pass và chưa khóa tên/IP production.

## 2026-08-10 — Local-first playable demo
**Decision:** Bản demo web dùng React + Vite và lưu progress trong `localStorage` để có thể chơi không cần backend. Không giả vờ gọi Gemini/Firebase ở client; điểm nối AI và persistence thật sẽ được bổ sung sau khi interaction spec và playtest được chốt.

## 2026-08-10 — Prototype visual convergence
**Decision:** Bản web dùng design token `Midnight Forest + Awakened Green + Crystal Blue + Rune Gold`, typography Lexend/Nunito Sans và tactile control tối thiểu 56px. Ảnh concept trong `img demo` là visual reference; asset đưa vào UI phải tránh lớp chữ/HUD baked-in ở foreground.

## 2026-08-10 — Nubi and Mạch prototype refinement
**Decision:** Nubi prototype dùng cơ thể mềm, ba dải cảm giác bất đối xứng và Lõi Tri Thức gắn trong anatomy để tránh silhouette cáo/mèo quen thuộc. Mạch giữ category phi vật chất gồm central core, sáu rune fragments và teaching-light ribbon. Đây vẫn chưa phải khóa IP production.

## 2026-08-10 — Support-safe rewards and separate metrics
**Decision:** Xin gợi ý không làm giảm Mảnh Tri Thức. Hệ thống ghi riêng `learningMetrics` (attempts, supports, guided completion, best mastery) và `gameplayMetrics` (sessions, replay, actions). Reward chỉ nhận một lần ở first clear; replay dùng để luyện và không farm currency.

## 2026-08-10 — First-time local profile flow
**Decision:** Prototype triển khai luồng `Đại Lãng Quên → hồ sơ tối thiểu → chạm Shard → Level 1`. Hồ sơ chỉ gồm alias và nhóm tuổi, lưu trên thiết bị; không thu ngày sinh hay thông tin liên hệ.

## 2026-08-10 — Pointer drag with accessible fallback
**Decision:** Các mechanic ghép số, phân loại, hình khối và chia phần dùng Pointer Events để kéo-thả được trên touch/mouse. Click-select và keyboard activation vẫn được giữ làm fallback; không dùng HTML5 Drag API.

## 2026-08-10 — Swappable local provider boundaries
**Decision:** Oracle, progress store và telemetry có interface local-first riêng. Descriptor phải nói rõ provider hiện tại không phải Gemini/Firebase/cloud analytics; tích hợp thật chỉ thay provider sau khi có cấu hình và phê duyệt.

## 2026-08-10 — Canonical 12-node vertical slice
**Decision:** Rừng Thức Tỉnh dùng 12 node theo thứ tự `collect → match → bridge → path → subtract → sort → shape → rune → scenario → mixed → challenge → boss`. Hai mechanic bổ sung là phép cộng qua đường đi và phép trừ bằng thao tác lấy bớt; cả hai tránh answer tiles.

## 2026-08-10 — Data-driven mastery phases
**Decision:** `mixed`, `challenge` và `boss` có ba phase config riêng, chỉ tham chiếu mechanic đã học trước đó. Boss không được sao chép nguyên chuỗi của mixed/challenge; completion ghi phase-level learning/gameplay telemetry.

## 2026-08-10 — Local mastery replay before cloud metagame
**Decision:** Sau vertical slice 12 màn, module tiếp theo là `Daily Adventure`: ba thử thách replay deterministic, ưu tiên skill có mastery thấp nhất, dùng lại mechanic đã mở và không cấp shard khi replay. Đây là vòng củng cố học tập local-first; không dùng streak pressure và không cần Firebase/paid API.

**Data:** Mỗi completion ghi một activity record giới hạn 90 mục gồm skill, mastery, attempts, supports, duration, mode và timestamp; không chứa alias hay dữ liệu liên hệ. Parent Dashboard chỉ tổng hợp lịch sử local này thành learning time, practice sessions và skill insight.

## 2026-08-10 — Knowledge City is a mastery showcase, not an economy
**Decision:** Knowledge City giữ đúng 4 công trình auto-build ở các mốc 3/7/9/12 chặng, nhưng mỗi mốc còn yêu cầu mastery tối thiểu 2 trên nhóm node nền tương ứng. Replay có thể cải thiện best mastery để mở công trình mà không farm shard/XP. Mỗi công trình mở một cosmetic thành tựu; Daily Adventure và Nubi evolution có thể mở thêm aura. Trang bị chỉ thay đổi hình ảnh Nubi ở City/Home/Creature, không tiêu shard, không tăng mastery và không thay đổi xác suất trả lời đúng.

## 2026-08-10 — League demo is fictional, local and mastery-only
**Decision:** `Liên Minh Mầm Sáng` tồn tại như một nhánh demo bên trong Knowledge City, không là CTA ngang hàng ở Home. Bốn hồ sơ đồng hành là nhân vật hư cấu, được ghi rõ trong UI; alias của trẻ chỉ đọc từ profile local và không rời thiết bị.

**Scoring:** Điểm League chỉ bằng `1 × unique completed node + 10 × best mastery` của node đó. Shard, số replay, actions, attempts và thời gian online có trọng số bằng 0. Hạng là huy hiệu trực quan; không cấp sức mạnh hoặc currency. Firebase leaderboard thật vẫn là integration gate riêng.

## 2026-08-10 — Child profile uses a swappable local boundary
**Decision:** Profile tối thiểu (`alias`, `ageBand`) đi qua `profileStore`, được normalize và chỉ lưu local. Descriptor nói rõ không sync Firebase; dữ liệu ngoài schema bị loại trước khi lưu. UI gameplay vẫn hoạt động nếu browser storage bị chặn.

## 2026-08-10 — Adaptive Oracle pacing stays constrained
**Decision:** Mạch dùng `ageBand`, prior completions và best mastery tại runtime để chọn thời điểm auto-hint đầu tiên. Mastery cao được thêm thời gian tự khám phá; trẻ 5–6 tuổi hoặc kỹ năng từng hoàn thành có hướng dẫn nhận visual scaffold sớm hơn. Nội dung vẫn nằm trong hint ladder đã duyệt, không sinh curriculum tự do và không gửi alias/age band vào telemetry.

## 2026-08-10 — Curriculum release is fail-closed
**Decision:** Mỗi node phải có `grade`, `subject`, `domain`, `skillId`, tên/mục tiêu tiếng Việt, prerequisites, difficulty, source reference, explicit approval và ít nhất một gameplay template. Prototype source được phép chạy demo nhưng chỉ tạo warning.

**Release gate:** Production audit phải fail nếu node chưa được human-approved, thiếu structured official source evidence, dùng generic/AI-generated source, trùng ID/skill, dùng mechanic không được runtime hỗ trợ hoặc tham chiếu prerequisite không tồn tại/đứng sau. `npm run build` chạy production gate; chỉ `build:demo` cho phép prototype. Validator không được tự chuyển `approved`.

## 2026-08-10 — Cloud integrations are fail-closed
**Decision:** Gemini chỉ được tích hợp qua server endpoint; API key không được xuất hiện trong client. Request dùng allowlist không chứa alias/age band/free text, response phải qua schema và curriculum-safety validation, mọi lỗi đều fallback về Oracle local.

**Firebase:** Dữ liệu trẻ em thuộc parent-owned path `parents/{parentId}/children/{childId}`, yêu cầu authenticated parent, Security Rules v2 đã deploy, retention tối đa 365 ngày và consent trước khi bật persistent cache trên thiết bị tin cậy. Sync dùng revision compare-and-set và báo conflict thay vì ghi đè âm thầm. Hợp đồng code hiện chưa đồng nghĩa Firebase/Gemini đã được cấu hình hoặc deploy.

## 2026-08-10 — Optional World branches reinforce, never gate
**Decision:** Rừng Thức Tỉnh có hai Side Quest (`firefly-pairs`, `seed-ferry`) và một Secret Quest (`moon-rune`) trên nhánh bản đồ riêng. Side Quest hiện như lối rẽ phụ; Secret Quest chỉ lộ biểu tượng sau khi hoàn tất discovery prerequisites và không cần text label trên bản đồ.

**Progression:** Nhiệm vụ tùy chọn dùng lại mechanic đã học, ghi activity/mastery ở mode riêng, không tham gia prerequisite của 12 Main Quest, không cấp shard và không tăng hạng League. First clear chỉ mở cosmetic thành tựu; replay tiếp tục luyện kỹ năng nhưng không nhân phần thưởng.

## 2026-08-11 — Nubi evolution changes anatomy, not only copy
**Decision:** `nubiStage` ánh xạ qua registry hình thái data-driven. Stage 1 `Mầm Sáng` dùng sprite khởi đầu; stage 2 `Dẫn Quang` dùng sprite alpha riêng, Lõi hai tầng, rune mastery và hai vây sáng nhưng vẫn giữ đúng ba dải cảm giác cùng gương mặt Nubi.

**Trigger:** Chỉ first clear Boss làm stage tăng mới tạo evolution transition và cinematic. Boss replay đi thẳng về bản đồ; người chơi đã mở stage 2 có thể xem lại cinematic từ trang Nubi mà không nhận lại shard/reward. Home, City và Creature đều đọc cùng registry nên không thể hiển thị sai hình thái sau reload.

## 2026-08-11 — Campaign progression is isolated by World boundary
**Decision:** Main Quest không còn được xem như một sequence global duy nhất. `worlds` registry ánh xạ node, optional quest, Boss, prerequisite và trạng thái playable/preview theo từng World; App resolve Home/Map/progress từ active World.

**Migration:** Progress legacy được gắn vào `forest-awakening` mà không mất completion, shard, mastery hoặc quest state. `completedWorldIds` luôn được suy ra lại từ toàn bộ node boundary của World, không tin dữ liệu persisted trực tiếp. World preview không có node, không thể active/play và chỉ đổi từ locked sang preview sau khi prerequisite hoàn tất. Cloud payload chỉ giữ campaign id nằm trong allowlist.

## 2026-08-11 — Audio support is local, optional and fail-closed
**Decision:** Gameplay có procedural cues nhẹ cho tap, soft-fail, hint, success và evolution. Provider không tạo AudioContext hoặc phát nội dung trước user gesture; mọi lỗi autoplay/device đều trả controlled failure và không cản gameplay.

**Narration:** Nút `Nghe` và Oracle hint chỉ gọi browser speech khi có giọng Việt `localService=true`. Không dùng cloud TTS, không ghi âm, không lưu transcript và không fallback sang remote/default voice. Nếu không có giọng phù hợp, UI nói rõ trạng thái và tiếp tục dùng text/visual/`aria-live`. Preference chỉ gồm mute, effects, narration và volume, lưu local riêng khỏi child profile.

## 2026-08-11 — Session Compass counts active attention, not elapsed wall time
**Decision:** Reminder mặc định là 20 phút và chỉ cộng tick tối đa 5 giây khi document visible, window focus và session đang active. Preference local chỉ gồm `enabled` và limit allowlist 10/15/20/30; trạng thái phiên chỉ nằm trong `sessionStorage`, không chứa profile hoặc progression.

**Safe interruption:** Khi đạt ngưỡng trong gameplay, Restoration hoặc Evolution, reminder chuyển pending và chờ tới Home, Map, City, Creature, League hoặc checkpoint/summary của Daily Adventure. Màn hình nghỉ không có countdown, lock, streak loss hay reward. `Chơi nốt một chặng` cấp grace 5 phút; phiên mới reset active time nhưng giữ reminder count cho báo cáo tại tab hiện tại.

## 2026-08-11 — Direct manipulation is the default for object-placement boards
**Decision:** Các board có vật thể cần đặt vào vùng đích đều expose Pointer Events drag trên touch/mouse: collect → core, add → bridge pedestal, path → missing step, match → quantity group, subtract → nest, compare → river bank, shape → slot, pattern → missing rune và scenario → friend plate. Mỗi drag source vẫn là button có click/keyboard fallback để không biến pointer support thành điều kiện bắt buộc.

## 2026-08-11 — Interaction behavior is a data contract before it is a component detail
**Decision:** `src/interactionSpecs.js` là source of truth cho learning-facing interaction của 12 node. Component chịu trách nhiệm render/execute; spec chịu trách nhiệm mô tả objective, gesture, drop zones, soft-fail, hints, mastery, feedback và exit. Validator fail nếu node runtime không có spec hoặc spec drag thiếu drop zone. Runtime chỉ hiển thị gesture hint ngắn từ contract; không tự động cấp curriculum approval.

## 2026-08-11 — Daily Adventure closes with a discovery beat
**Decision:** Sau queue replay deterministic (tối đa ba challenge), Daily Adventure mở `Mạch Ký Ức`: một discovery activity kéo-thả local-only sắp xếp route vừa luyện. Discovery không tạo learning outcome, shard, mastery hoặc streak; chỉ ghi `discoveryActivitiesCompleted` và đóng phiên trước Summary. Nếu rời giữa chừng, các challenge đã ghi nhận vẫn giữ nguyên nhưng session chưa được tính là hoàn tất.

## 2026-08-11 — Light Bridge is an environmental repair circuit
**Decision:** Light Bridge bỏ presentation equation/answer style. Người chơi kéo ba tinh thể vào nhịp cầu trực tiếp; state engine giữ tiến trình 4→7 nhịp, dòng năng lượng chạy tới cổng và success overlay dùng Nubi theo stage. Click/keyboard fallback và focus state vẫn được giữ. Không thêm curriculum claim, currency hoặc cloud state.

## 2026-08-11 — Shape Workshop and Scenario Simulation use environmental affordances
**Decision:** Shape Workshop chuyển nhận biết hình thành repair/construction: ba mảnh hình được kéo vào ba khe hình học để đánh thức machine core. Scenario Simulation chuyển bài toán chia phần thành một campfire scene có hai station của Míu và ba station của Tí; người chơi kéo năm phần quả vào đúng station. Cả hai engine đều immutable, fail-closed với dữ liệu malformed, có click/keyboard fallback và không ghi progress trong Playtest Lab.

**Verification:** Playwright pointer drag đã hoàn tất cả hai board trên desktop; Scenario Simulation được kiểm tra thêm ở viewport 390×844 không có horizontal overflow. Production curriculum và cloud boundary không thay đổi.

## 2026-08-11 — Rune, Sorting và Boss dùng affordance trực quan có thể kiểm duyệt
**Decision:** Rune Path chuyển thành một cổng nhịp có chuỗi rune nối liền, ô khuyết và khay chọn; Sorting Stream dùng kích thước hạt cùng bờ nông/sâu thay cho hướng dẫn dài. Boss hiển thị Lõi Tri Thức và gọi lại đúng ba mechanic đã học: collect → add/bridge → pattern/rune.

**State contract:** `src/bossRestorationEngine.js` giữ phase order immutable, chỉ nhận phase kế tiếp, từ chối duplicate/unknown/out-of-order và normalize fail-closed. UI `MultiStageBoard` dùng transition này cho Boss; completion vẫn đi qua callback telemetry hiện có.

**Nubi feedback:** Sprite Nubi tiếp tục là PNG alpha riêng; trạng thái `resonant` thêm wave, orbit, core flare và particle burst cho success/restoration mà không đặt background hình chữ nhật lên nhân vật. `prefers-reduced-motion` vẫn tắt animation theo accessibility policy.

**Verification:** Engine Boss có 9 test riêng; Playwright cần kiểm tra lại visual Sort/Rune/Boss trên desktop và viewport mobile trước khi chốt slice. Production curriculum, cloud integration và approval boundary không thay đổi.

## 2026-08-11 — Multi-stage preview exposes the complete playable structure
**Decision:** `Playtest Lab` mở thêm `mixed` và `challenge`, không chỉ Boss. Hai node dùng cùng phase registry và mechanic components canonical nhưng có identity shell riêng: `Trạm Giao Cảm` cho chuỗi đếm → nối → ghép hình và `Hang Tia Sáng` cho ghép → nối → so sánh.

**Boundary:** Preview vẫn local-only, không ghi progress/mastery/reward và không biến prototype content thành curriculum approval. Mỗi phase tiếp tục giữ drag primary cùng click/keyboard fallback của component nguồn.

## 2026-08-11 — Nubi phản hồi theo gameplay state và mọi main node đều duyệt được
**Decision:** `src/nubiFeedback.js` giữ state machine thuần, immutable và fail-closed cho các mood `idle`, `curious`, `hint`, `soft-fail`, `phase-complete` và `resonant`. PlayView ánh xạ event action, Oracle hint, soft-fail, phase transition và level success vào mood; companion signal nhỏ giúp Nubi hiện diện trong lúc chơi thay vì chỉ xuất hiện ở reward overlay.

**Interaction feedback:** Bridge và Path không còn silent no-op khi placement bị từ chối; board trả nudge cụ thể qua Oracle dock. `Playtest Lab` duyệt toàn bộ 12 Main Quest node, gồm cả Match, Path và Subtract, nhưng vẫn local-only và không ghi progress/mastery/reward.

**Verification:** `src/nubiFeedback.test.js` bao phủ transition hợp lệ, malformed state, unknown event, immutability và reset. Browser verification đã kiểm tra Nubi alpha sprite, mood hint/resonant, pointer drag Path/Bridge/Sort, 12 card preview và mobile không tràn ngang.

## 2026-08-11 — Daily Adventure resume là local và giới hạn theo ngày
**Decision:** Phiên `Daily Adventure` được phép tiếp tục sau khi rời hoặc reload bằng một resume record local gồm queue deterministic, `currentIndex`, kết quả challenge đã hoàn tất và phase. Record hết hạn khi sang ngày mới hoặc không vượt qua validation; completion cuối cùng xóa record.

**Boundary:** Không lưu snapshot board đang thao tác, không ghi resume vào child progress, không cấp shard/mastery/reward cho replay và không gửi dữ liệu resume lên cloud. Nếu reload giữa board, phiên trở về checkpoint an toàn của challenge hiện tại.

## 2026-08-11 — Oracle gợi ý theo lỗi thao tác
**Decision:** Board chuẩn hóa lỗi thành `errorCode` allowlist; Oracle ưu tiên ladder đặc thù cho lỗi đó rồi fallback về ladder mechanic chung. `errorCode` được dùng để cải thiện feedback và telemetry kỹ thuật, không chứa alias, tuổi, free text hay dữ liệu định danh trẻ.

## 2026-08-11 — Onboarding phải đi qua bản đồ trước node đầu tiên
**Decision:** Sau awakening, flow vào Adventure Map với callout ký ức đầu tiên và highlight node đang mở. Người chơi vẫn có thể bỏ qua callout, nhưng không bị đưa thẳng vào Level 1; cách này giúp map trở thành cấu trúc điều hướng thật ngay từ first touch.

**Verification:** Tại thời điểm quyết định, full test `188/188` pass; `npm run audit:curriculum` prototype audit PASS với `12 nodes, 0 approved, 0 errors, 24 warnings`; `npm run build:demo` pass. Playwright đã kiểm tra resume sau reload, hint đặc thù cho Match và onboarding map trên desktop/390px mobile, đều không có console error hoặc horizontal overflow.

## 2026-08-11 — World blueprint preview is navigable but never playable
**Decision:** Thẻ chân trời của World kế tiếp trên Adventure Map mở một màn hình blueprint read-only để người duyệt xem title, lore direction, pillars và curriculum gate. Preview không tạo node, reward, progress, approval hoặc active World; telemetry chỉ ghi một gameplay view event local với `worldId` allowlist.

**Boundary:** World chỉ chuyển sang playable khi có curriculum evidence chính thức và human approval. UI vẫn hiển thị trạng thái `Chưa mở playable`, kể cả khi người dùng đã xem blueprint.

## 2026-08-11 — XP is a bounded first-clear progression signal
**Decision:** Progress có thêm `xp` tách khỏi Mảnh Tri Thức và learning mastery. First-clear nhận base XP theo reward cộng mastery bonus nhỏ; guided/support vẫn nhận base XP, independent chỉ cao hơn ở bonus. Replay, Daily Adventure replay và optional quest không tạo XP farm; XP được hiển thị đồng nhất ở HUD, Restoration và Parent Dashboard.

**Boundary:** XP không đổi đáp án, không mở curriculum approval và không được gửi ra cloud ngoài progress payload allowlist khi cloud integration đủ điều kiện.

## 2026-08-11 — Active play draft is local-only and checkpoint-based
**Decision:** Main Quest và optional quest tạo một draft local khi bắt đầu chơi. Draft chỉ lưu identity content đã allowlist, phase kế tiếp và timestamp để Home có thể `Tiếp tục` sau back/reload hoặc `Bắt đầu lại` từ đầu.

**Boundary:** Không snapshot board internals, không ghi PII/progress/reward vào draft và không sync cloud. Completion xóa draft; malformed hoặc content không còn hợp lệ bị bỏ qua fail-closed. Multi-stage board chỉ khôi phục phase an toàn, còn state thao tác của board được tạo mới.

## 2026-08-11 — Energy categories are bounded and curriculum-aware
**Decision:** Progress có thêm bốn counter allowlist `logic`, `nature`, `discovery` và `mastery` theo game bible. Node/quest khai báo category trong data; first-clear independent nhận +2 mỗi category, guided/support nhận +1, còn replay không farm. Restoration và Parent Dashboard hiển thị reward/category để người duyệt thấy mối nối giữa mechanic và progression.

**Boundary:** `Nature Energy` chưa được cấp trong World 1 vì chưa có nội dung Khoa học/Tự nhiên cùng nguồn chính thức/human approval. Counter được normalize/clamp, cloud payload chỉ giữ canonical energy object; hệ năng lượng không thay thế mastery, shard, XP hoặc curriculum approval.

## 2026-08-11 — Valid-target drag feedback and viewport-bound success burst
**Decision:** Pointer drag chỉ làm nổi bật các `data-drop-zone` nằm trong allowlist của token hiện tại. Khi thả đúng, vùng đích nhận `data-drop-landed` để phát landing pulse ngắn; khi thả sai, interaction bị hủy mà không gọi `onDrop`. Click và keyboard fallback không đổi.

**Visual contract:** Success burst sắp Nubi, resonance icon và completion copy thành các lớp riêng. Overlay bị giới hạn theo viewport của vùng chơi để copy luôn nằm dưới Nubi nhưng vẫn nhìn thấy trên màn hình có board cao hơn viewport. `prefers-reduced-motion` tiếp tục tắt animation.

**Verification:** `npm test` pass 213/213; `npm run build:demo` pass; browser kiểm tra target `2` duy nhất nhận `data-drag-hover="true"` khi kéo số 2, success burst có `textOverlapsNubi=false`, và viewport mobile không có horizontal overflow.

## 2026-08-11 — Nubi cộng hưởng trực tiếp với Energy registry
**Decision:** `src/nubiResonance.js` là pure, immutable và fail-closed cho bốn Energy type canonical. Trong board, Nubi dùng ambient intensity 1 theo category của node; success/restoration dùng reward context để nâng intensity lên 2, chọn primary type theo canonical order và earned amount, đồng thời hiển thị badge mạch vừa nhận.

**Boundary:** Cộng hưởng chỉ là visual/feedback cue. Nó không gợi đáp án, không thay đổi reward, mastery, XP, curriculum approval, cloud payload hoặc Nature Energy gate. Type lạ bị bỏ qua; không có type hợp lệ thì Nubi ở trạng thái calm.

**Verification:** `src/nubiResonance.test.js` có 6 test về canonical IDs, malformed input, ordering, reward intensity cap và immutability; full `npm test` pass 219/219; `npm run build:demo` pass với curriculum prototype `12 nodes, 0 approved, 0 errors, 24 warnings`.

## 2026-08-11 — Oracle manifestation state machine
**Decision:** Mạch được tách khỏi text hint thành một state machine pure tại `src/oraclePresence.js`: `dormant`, `materializing`, `teaching`, `guiding`, `celebrating`, `dissolving`. `PlayView` map event allowlist vào state; success giữ một nhịp celebration rồi dissolve trước khi chuyển sang restoration.

**Visual contract:** Manifestation gồm central image/core, orbit, rune fragments và teaching beam. CSS chỉ đọc `data-oracle-state` và intensity `0..2`; dormant vẫn giữ nút trợ giúp để bảo toàn agency, còn visual presence được tăng khi trẻ gọi hint. `mix-blend-mode: screen` và crop tròn giúp asset Oracle hiện như floating construct thay vì một khối nền chữ nhật.

**Boundary:** State machine không dùng React, timer, storage, network, free text, alias hoặc age band. Oracle live Gemini vẫn bị chặn bởi provider/curriculum safety boundary; thay đổi này chỉ hoàn thiện prototype feedback.

**Verification:** `src/oraclePresence.test.js` có 6 test về registry, flow, hint clamp, malformed event, immutability và UI snapshot; full `npm test` pass 225/225; `npm run build:demo` pass; browser smoke xác nhận `dormant → materializing → teaching`, intensity `0 → 1 → 2`, và không có Vite error overlay.

## 2026-08-11 — Nubi có visual signal local và drag affordance nhất quán
**Decision:** `src/nubiSignal.js` giữ signal model pure, immutable và fail-closed với các state `ambient`, `attention`, `responding`, `resonant` và `recovering`. `PlayView` chỉ phát event allowlist từ action, hint, soft-fail, phase completion và success; signal được render thành beam/burst ngắn cạnh Nubi.

**Visual contract:** Nubi root expose `data-nubi-signal`, intensity `0..3`, cùng core/beam/burst flags. Sprite runtime chỉ dùng PNG alpha có transparent margin, không dùng asset có baked background; reduced-motion tắt toàn bộ animation. `DragToken` expose `data-drag-source`/`data-dragging`, cursor `grab` và focus-visible để affordance drag đọc được trước khi kéo.

**Boundary:** Signal chỉ là feedback nhận biết hành động; không gợi đáp án, không thay đổi reward/mastery/XP/curriculum approval và không lưu dữ liệu trẻ. Pointer drag vẫn có click/keyboard fallback.

**Verification:** `src/nubiSignal.test.js` bao phủ transition hợp lệ, unknown event, malformed state và immutability; `src/nubiAssets.test.js` kiểm tra PNG RGBA, transparent corner/margin và runtime registry không tham chiếu `nubi-hero-v2.png`. Full `npm test` pass 232/232; `npm run build:demo` pass với curriculum prototype `12 nodes, 0 approved, 0 errors, 24 warnings`. Browser smoke xác nhận action/hint chuyển signal sang `responding`, drag collect tăng tiến trình và viewport mobile không overflow.

## 2026-08-11 — Drag cancel không được rơi qua tap fallback
**Decision:** `DragToken` dùng cùng một click-suppression guard cho `onDrop` hợp lệ và `onCancel`. Khi Pointer Events đã vượt ngưỡng drag nhưng thả ngoài allowlist hoặc bị `pointercancel`, synthetic click sau đó không được gọi `onClick`; tap bình thường và keyboard activation vẫn giữ nguyên.

**Visual contract:** Nubi signal thống nhất giữa pure model và CSS: `attention` dùng beam mềm, `responding` dùng beam + burst, `resonant` dùng beam + burst mạnh, còn `ambient/recovering` ẩn beam. `data-nubi-beam` và `data-nubi-core` là các cờ CSS-safe bounded.

**Verification:** `src/usePointerDrop.test.js` kiểm tra DragToken source contract; browser smoke thả một hạt ra `body` giữ `0/5`, kéo vào `.collect-core` tăng lên `1/5`, signal action đọc `responding` intensity `2`, và viewport `375×812` không overflow. Full `npm test` pass 236/236; `npm run build:demo` pass với curriculum prototype `12 nodes, 0 approved, 0 errors, 24 warnings`.

## 2026-08-11 — Child gameplay HUD focus mode
**Decision:** Khi view là `play`, `quest-play` hoặc `practice-play`, TopBar chuyển sang focus mode cho trẻ: giữ world progress stream, một XP signal và settings; ẩn điều hướng map/Nubi/city, session reminder và shard currency khỏi header thao tác chính. Người chơi vẫn quay lại map bằng control trong level và phụ huynh vẫn vào được qua settings gate.

**Visual contract:** Focus mode có `data-hud-focus="true"`, tối đa một currency visible (`XP`), progress world là một stream duy nhất; responsive 375px không tạo horizontal overflow. Các view home/map/city/parent giữ HUD đầy đủ.

**Boundary:** Đây chỉ là hierarchy/UI change; không đổi reward, mastery, progress, session policy, parent gate, curriculum approval hay cloud boundary. `GAMEPLAY_FOCUS_VIEWS` là registry local immutable và không bao gồm preview/onboarding/meta views.

**Verification:** `src/hudFocus.test.js` bao phủ registry immutable và allowlist view; browser desktop/mobile xác nhận chỉ còn XP + settings, không có `.shard-counter`/navigation phụ, settings vẫn mở được, viewport `375×812` là `NO_HORIZONTAL_OVERFLOW`, không có Vite overlay. `npm run build` tiếp tục bị chặn có chủ đích với `12 nodes, 0 approved, 36 errors, 0 warnings`.

## 2026-08-11 — Daily Adventure discovery board giữ cùng drag contract
**Decision:** Feedback kéo-thả dùng chung cho `.game-board` và `.discovery-board`: chỉ drop zone nằm trong allowlist của fragment mới nhận `data-drag-hover="true"`; thả hợp lệ phát landing pulse ngắn qua `data-drop-landed`. Không đổi engine placement, không cấp mastery/shard/reward và không bỏ click/keyboard fallback.

**Verification:** `src/discoveryEngine.test.js` kiểm tra selector hover/landing, reduced-motion và fallback controls. Browser `daily-proof` xác nhận `.discovery-board [data-drop-zone="slot-0"]` có `data-drag-hover="true"`, border vàng và animation `drop-ready` khi fragment hợp lệ đang kéo; sau đó hoàn tất 3 fragment và Summary hiển thị `Ba ký ức đã được củng cố.` Full `npm test` pass 239/239; `npm run build:demo` pass.

## 2026-08-11 — Learning Proof Loop nối activity local với objective canonical
**Decision:** `getLatestLearningProof()` lấy record hoàn tất local mới nhất đã normalize, join theo `nodeId` vào registry chặng canonical rồi hiển thị objective, skill, first-clear/latest practice, mastery, attempts, supports và duration ở Parent Dashboard. Missing/malformed/future/unknown records fail-closed; không suy luận chẩn đoán, không ghi PII và không gọi Firebase/Gemini.

**Verification:** `src/parentInsights.test.js` pass 7/7 cho join canonical và fail-closed cases; browser Parent Dashboard hiển thị `Một lượt chơi có ý nghĩa`, objective `Hiểu phép cộng qua việc thêm vật thể vào một nhóm.`, mastery, lượt thử, hỗ trợ và thời lượng. Viewport `375×812` giữ `overflow=false`. Full `npm test` pass 239/239; `npm run build:demo` pass.

## 2026-08-11 — First-session flow nối awakening, Oracle và Level 1
**Decision:** Sau khi child hoàn tất hồ sơ và chạm Knowledge Shard, app mở Oracle local ngắn thay vì dừng ở Map. Hai CTA `Bắt đầu Bãi Hạt Sáng` và `Bỏ qua lời giới thiệu` dùng chung state machine pure `src/firstSessionFlow.js`, tự động mở node đầu tiên; sau restoration, lần đầu quay về Adventure Map. Nút brand/back vẫn cho phép thoát an toàn về Map.

**Boundary:** Flow chỉ là UX/progression bridge trong React state của phiên hiện tại. Nó không thêm reward, mastery, curriculum approval, PII, Firebase hay Gemini; refresh/load cũ vẫn fail-closed theo profile/progress hiện có.

**Verification:** `src/firstSessionFlow.test.js` pass 5/5; full `npm test` pass 244/244; `npm run build:demo` pass với `49 modules`; browser desktop xác nhận Oracle → Level 1 → restoration → Map, mobile `375×812` xác nhận `overflow=false`, focus HUD và cả CTA start/skip.

## 2026-08-11 — First-session continuation mở mechanic hai và boss tease
**Decision:** Sau khi `collect` hoàn tất, restoration ghi mốc vào `src/firstSessionContinuation.js`; Map hiển thị CTA rõ ràng cho `match`, mở `MechanicIntroView` từ `src/interactionSpecs.js`, rồi cho chơi Level 2 bằng drag. Completion của Match chỉ mở `BossTeaseView`; teaser không unlock boss, không cấp reward mới và không bỏ qua prerequisite. State normalize theo phase, immutable và fail-closed với malformed/bypass events.

**Visual contract:** Nubi runtime giữ asset RGBA transparent, thêm contact shadow dưới sprite và depth cue cho particle/orbit; không đưa asset flattened `nubi-hero-v2.png` vào runtime. `mechanic-intro` và `boss-tease` thuộc HUD gameplay focus để giữ trải nghiệm child-facing nhất quán.

**Boundary:** Continuation chỉ là local React session state; không thêm curriculum approval, official evidence, PII, Firebase/Gemini hay production unlock. Telemetry chỉ nhận gameplay event allowlist với node/mechanic/source identifiers.

**Verification:** Full `npm test` pass `251/251`; `npm run build:demo` pass với curriculum prototype `12 nodes, 0 approved, 0 errors, 24 warnings` và Vite `50 modules`. Browser desktop xác nhận Map card → mechanic intro → Match drag `3/3` → boss tease `không mở khóa` → Map `2/12`; mobile `375×812` xác nhận Map card `332px` nằm trong viewport, mechanic intro `overflow=false`, Match drag và không có page errors. `npm run build` vẫn bị chặn có chủ đích bởi `12 nodes, 0 approved, 36 errors, 0 warnings` cho đến khi có official curriculum evidence và human approval.

## 2026-08-11 — Environmental Restoration là route puzzle local-first
**Decision:** `Bến Hạt Trôi` chuyển kỹ năng so sánh kích thước đã học thành một Side Quest có state môi trường hữu hạn: bốn hạt ở source, hai destination có connection/capacity rõ ràng và tuyến đúng được suy ra từ `kind` của resource cùng `accepts` của node. Đây là bước đầu cho Environmental Restoration, không phải một quiz lặp lại.

**State contract:** `src/resourceRoutingEngine.js` normalize config/state thành dữ liệu immutable gồm resource ids/kinds, node roles, connections, placements, actions, mistakes, supports và timestamps allowlist. `ResourceRouteBoard` dùng cùng contract cho drag primary, click/tap/keyboard fallback, valid-target highlight và nudge theo `wrong-route`/`capacity`.

**Boundary:** Route chỉ chạy trong Side Quest, completion ghi `activityHistory`/quest state local và không ghi đè `nodeOutcomes` của Main Quest; không cấp shard/XP farm, không mở Main prerequisite, không tạo curriculum claim, không gửi PII/raw answer/cloud state. Production build vẫn fail-closed cho đến khi có official curriculum evidence và human approval.

**Verification:** Full `npm test` pass `265/265`; `npm run build:demo` pass với prototype `12 nodes, 0 approved, 0 errors, 24 warnings`; browser xác nhận desktop/mobile route, pointer drag tiến trình `0/4 → 1/4`, fallback control, Nubi không có nền chữ nhật và viewport `375×812` không overflow. OpenCode read-only review đã được gọi nhưng không trả về final report đầy đủ trước khi kết thúc process; kết luận cuối cùng dựa trên test/build/browser verification của Codex.

## 2026-08-11 — Environmental Restoration simulation nối Side Quest với Knowledge City
**Decision:** `Vạt Cỏ Đom Đóm` dùng `src/environmentRestorationEngine.js` để biến kỹ năng ghép lượng thành mô phỏng hai biến bounded: `Nước` và `Ánh sáng` phải về dấu mục tiêu bằng bốn dụng cụ có target allowlist. Đây là một Side Quest finite/local-first, không lặp lại Main board và không mở rộng curriculum claim.

**State contract:** Engine chỉ giữ `schemaVersion`, activity/mode/seed, phase, values, usedActions, counters và timestamps allowlist. Config/state immutable, clamp fail-closed; action đi xa mục tiêu được phân loại `drift`, nhưng không mất tiến trình. `EnvironmentRestorationBoard` giữ drag primary, tap selection, keyboard/native button fallback, valid target highlight, landing pulse và `aria-live` instruction.

**City boundary:** Completion đi qua `recordQuestCompletion` hiện có; `cityRestorationFeatures` chỉ đọc `questState.completedIds` để render nhật ký vùng sống. Không ghi đè `nodeOutcomes`, không cấp shard/XP farm, không lưu raw answer/PII và không gọi cloud.

**Verification:** Engine `9/9`; full `npm test` `276/276`; `npm run build:demo` pass với `12 nodes, 0 approved, 0 errors, 24 warnings`, Vite `53 modules`. Browser đã xác nhận wrong-target fail-closed, pointer drag `0/6 → 1/6`, completion bằng drag, City log, screenshots desktop/mobile và viewport `390×844` không overflow; page errors rỗng. `npm run build` vẫn bị chặn có chủ đích bởi curriculum approval/evidence chưa đủ.

## 2026-08-11 — Daily Adventure có puzzle chuyển mạch riêng
**Decision:** Sau chuỗi replay deterministic, `Daily Adventure` thêm `Dệt Mạch Năng Lượng` trước `Mạch Ký Ức`. Queue hiện tại được ánh xạ local thành token và lane theo `ENERGY_TYPES`; placement đúng dựa trên energy type, lane capacity và action budget bounded. Puzzle này là một model gameplay riêng, không biến một mechanic Main Quest thành một câu hỏi lặp lại.

**Boundary:** `src/dailyWeaveEngine.js` chỉ giữ config/state immutable gồm token ids, lane ids, placements, actions, mistakes và phase; normalize fail-closed, loại bỏ PII/raw answer và không gọi cloud. Completion chỉ nối sang discovery activity, không cấp mastery, shard, XP farm, streak hoặc curriculum approval mới. Drag Pointer Events là primary; tap/chọn rồi chạm lane và keyboard button là fallback.

**Verification:** Full `npm test` pass `286/286`; `npm run build:demo` pass với `12 nodes, 0 approved, 0 errors, 24 warnings`, Vite `54 modules`; browser đã xác nhận flow thật qua replay → puzzle → discovery, drag desktop/mobile, screenshot artifacts và mobile `390×844` không overflow. `npm run build` tiếp tục fail-closed đúng chủ đích khi curriculum evidence/human approval chưa đủ.

## 2026-08-11 — City restoration projection is derived world state
**Decision:** Knowledge City đọc `questState.completedIds` qua `src/restorationProjectionEngine.js` để dựng projection immutable cho các vùng sống. Feature metadata chỉ cho phép visual cue (`firefly-grove`, `river-bank`) và canonical energy types; City hiển thị trạng thái `dormant/restored` bằng cảnh, particle, glow và river shimmer thay vì chỉ ghi log.

**Boundary:** Projection là dữ liệu dẫn xuất local-only, fail-closed và không chứa raw answer/PII. Nó không tạo reward, mastery, XP, Main Quest prerequisite, persistence mới hoặc cloud payload. Nubi chỉ nhận ambient resonance từ các mạch vùng để feedback hình ảnh.

**Verification:** Engine test malformed completed ids, unknown feature/energy, dedupe, immutability và privacy boundary; App browser verification phải bao gồm Restoration summary, City desktop/mobile, no horizontal overflow và reduced-motion behavior.

## 2026-08-11 — Resource route projects the valid path without changing rules
**Decision:** `ResourceRouteBoard` dùng `getResourceRouteTargetIds` để chiếu live tuyến phù hợp khi trẻ chọn một hạt. Đường hợp lệ tăng sáng, đường còn lại giảm intensity; destination highlight và click/keyboard fallback giữ nguyên.

**Boundary:** Đây chỉ là visual affordance. Không copy raw answer, không suy luận kích thước ngoài route engine, không đổi capacity, wrong-route classification, completion, reward hoặc progression.

**Verification:** Browser desktop/mobile xác nhận `small → shallow-bank`, deep path opacity `0.2`, valid path opacity `1`, no horizontal overflow và không có page error.

## 2026-08-11 — Evolution uses the same layered Nubi renderer
**Decision:** `EvolutionView` render hình thái đích qua `NubiFigure` thay vì `<img>` rời. Sprite RGBA, silhouette alpha, contact shadow, core flare, orbit, resonance ribbon và signal burst vì vậy giữ cùng visual contract với Home/Play/City.

**Boundary:** Hình thái cũ vẫn là sprite shed riêng; thay đổi chỉ là renderer/feedback visual, không đổi trigger stage, reward, mastery, progression hoặc curriculum boundary.

**Verification:** Browser desktop/mobile xác nhận stage 2 dùng sprite `/assets/nubi-evolved-v2.png`, `data-nubi-signal="resonant"`, intensity `3`, energy intensity `1`, nền ảnh transparent và không overflow.

## 2026-08-11 — Drag attention không thay thế agency của trẻ
**Decision:** Khi Pointer Events thật sự vượt ngưỡng kéo, `.drag-token.dragging` chiếu một attention cue ngắn lên Nubi ở Main Quest, Daily Weave và Discovery. Cue gồm core/beam/spark/rhythm nhẹ; target hợp lệ vẫn do allowlist của từng token quyết định.

**Oracle boundary:** `PlayView` đã phát `soft-fail` trong failure path, nên `src/oraclePresence.js` materialize Mạch từ `dormant` sau thao tác lệch. Auto-hint hoặc nút gợi ý mới nâng tiếp lên `teaching`; soft-fail không tự đưa đáp án.

**Boundary:** Đây chỉ là feedback visual/presence local-only. Không đổi placement, answer state, reward, mastery, XP, telemetry payload, curriculum approval hoặc cloud boundary; `prefers-reduced-motion` tiếp tục tắt animation.

**Verification:** Unit test mới xác nhận `soft-fail → materializing → teaching` và transition từ celebration; visual contract test kiểm tra drag selector/keyframes. Browser cần xác nhận Nubi phản hồi trong lúc kéo và vẫn không có horizontal overflow.

## 2026-08-11 — Daily Weave và Discovery dùng chung Oracle support loop
**Decision:** Hai màn luyện tập dùng `OracleSupportDock` và `oraclePresence` chung với Main Quest. `wrong-lane`, `full`, `max-actions`, `wrong-slot` và `no-selection` chỉ tạo soft-fail/materialize; hint level tăng qua local rule-based provider khi auto-hint hoặc trẻ chủ động yêu cầu.

**Boundary:** Daily/Discovery không có guided completion. Mạch không tự đặt token, không ghi mastery/reward/XP/curriculum/cloud; hoàn thành chỉ đi qua `level-success → dissolving` rồi mới callback kết thúc hoạt động local.

**Verification:** `src/oracleSupport.test.js` giữ source contract cho cả hai view; browser xác nhận auto-hint `1/3`, hint request đến `3/3` rồi khóa nút, wrong-slot và completion. Full `npm test` pass `295/295`; `npm run build:demo` pass với Vite `55 modules`.

## 2026-08-11 — Home Nubi phải phản hồi theo context, không chỉ là ảnh hero
**Decision:** Home truyền `homeNubiMood` và `homeNubiEnergyTypes` vào `NubiFigure`: stage 1 có chặng kế tiếp dùng `curious`, stage 2 dùng `resonant`. Hover, keyboard focus và press transform toàn bộ layered figure để giữ aura, core, particles và silhouette đồng bộ.

**Boundary:** Đây là presentation-only change. Không thay asset mascot, không chọn C04 thay Hieu, không đổi unlock/reward/mastery/progress/curriculum/cloud; `prefers-reduced-motion` vẫn là cổng tắt animation.

**Verification:** `src/nubiVisual.test.js` kiểm tra Home context wiring và focus contract; browser cần xác nhận `data-nubi-mood`/`data-energy-type`, alpha background và Home responsive focus.
## 2026-08-11 — Play signal phân bổ độ nổi bật cho Nubi
**Decision:** `PlayView` dùng signal companion lớn hơn (`104×104px` desktop, `88×88px` mobile) và aura radial nên cùng Nubi visual contract hiện diện rõ trong Main Quest, Quest Play và Practice Play. Đây là presentation-only, không có asset mascot mới.

**Reduced motion:** Giữ static ribbon/particle/spark để Nubi không trở thành ảnh tĩnh trống; ẩn beam/burst/resonance wave vì các cue này phụ thuộc vào chuyển động.

**Boundary:** Không thay drag target, fallback thao tác, answer state, Oracle support, reward, mastery, XP, progress, curriculum approval hay cloud.

**Verification:** `src/nubiVisual.test.js`, full `npm test`, `npm run build:demo` và browser Play desktop/mobile/reduced-motion.
## 2026-08-11 — Mobile composition ưu tiên phần thân Nubi nhìn thấy
**Decision:** Các màn Restoration, City và Practice dành vùng layout rõ cho Nubi thay vì để card/panel hoặc parent `overflow:hidden` che phần thân nhân vật. Restoration tăng khoảng cách trước card; City nâng figure khỏi panel trang bị; Practice/Daily/Discovery giữ figure gần đáy trong viewport.

**Reduced motion:** Evolution ẩn sprite cũ và giữ target Nubi ở lớp trên khi animation bị tắt, nên stage cuối vẫn đọc được.

**Boundary:** Đây là stacking/layout presentation-only; không thay asset, interaction allowlist, drag/click/keyboard fallback, reward, mastery, XP, progress, curriculum approval hay cloud.

**Verification:** Browser mobile `390×844`, no-overflow, reduced-motion và full test/build demo.
## 2026-08-12 — Home mobile giữ Nubi và feedback trong scene bounds
**Decision:** Ở breakpoint `560px`, `.nubi-hero` nằm gọn trong parent scene; resonance ribbons và signal beam không còn mở rộng ra ngoài figure, còn focus outline dùng offset `2px`. Điều này ưu tiên feedback nhìn thấy được trên mobile thay vì để overflow hidden cắt aura.

**Boundary:** Presentation-only; không thay sprite, signal state, interaction, progress, reward, mastery, curriculum approval hay cloud.

**Verification:** Browser Home `390×844` với focus-visible, computed effect bounds, alpha background và no-overflow.
## 2026-08-12 - Optional quests must share the curriculum and world registry contract

**Decision:** Treat `firefly-pairs`, `seed-ferry`, and `moon-rune` as curriculum-bearing optional entries rather than UI-only branches. Each entry now declares grade, subject, domain, difficulty, gameplay template, mastery events, prototype source and explicit approval state.

**Registry boundary:** `auditOptionalQuestRegistry()` checks the quest-to-World mapping, source-node boundary, Main-node prerequisites, route/restoration scenario backlink, City restoration feature and cosmetic unlock. The audit is pure and fail-closed; it does not change progress, rewards, mastery or approval.

**Release boundary:** Prototype audit includes `12 nodes + 3 optional quests` and passes. Production audit reports missing human approval, official source and source evidence for all 15 entries, so `npm run build` remains intentionally blocked.

## 2026-08-12 - Awakening must show Nubi responding before navigation

**Decision:** The onboarding Knowledge Shard no longer navigates immediately. A local, bounded signal changes Nubi from curious to resonant, lets the player see the existing beam/burst/core feedback, then calls the existing `onFinish` callback after a short transition. The shard is disabled during that window so one gesture cannot submit twice.

**Visual boundary:** The scene keeps the canonical transparent `NubiFigure` and adds only CSS halo/orbit/shard-release treatment inside the existing onboarding bounds. No flattened mascot background, new mascot concept, reward, mastery, progress, curriculum approval, persistence or cloud/API call is added.

**Accessibility boundary:** The resonant state remains visible with `prefers-reduced-motion`; only the motion cues are disabled. The button remains the single labelled action and exposes its disabled state during the transition.

**Verification:** Source-contract tests cover the signal/timer/duplicate-click wiring and CSS covers the awakening halo, orbit, resonant state, reduced-motion rule and shard release. Browser QA must capture the pre-touch and post-touch states on desktop and mobile.

## 2026-08-12 - Practice Nubi must reflect the active energy thread

**Decision:** Practice Intro, Daily Weave and Discovery pass canonical energy types from their queue/challenge/source-node data into `NubiFigure`. This keeps the companion visually tied to the local learning thread even when no error or completion signal is active.

**Boundary:** This is derived presentation state only. It does not infer mastery, change drag/drop allowlists, alter click/tap/keyboard fallback, grant reward/XP, write progress or curriculum approval, persist new data, or call cloud/API services. Reduced-motion retains static resonance layers and disables motion cues through the existing global policy.

**Verification:** `src/nubiVisual.test.js` covers all three bindings; full regression and `npm run build:demo` must remain green. Browser QA should confirm the Daily/Discovery figure has a non-neutral `data-energy-type` when the challenge contains canonical energy data and still has no horizontal overflow.

## 2026-08-12 - Scenario must read as a live world action

**Decision:** Keep the existing Scenario engine boundary of five portions split 2 for Míu and 3 for Tí, but make the simulation communicate a clear next need. The first unfilled station for the active friend receives the `active` state; later stations are `queued`, accepted portions light campfire progress dots, and the served station receives a short visual response. A bounded status callout explains the next need after each delivery.

**Interaction boundary:** All existing stations remain tap targets and portions keep both Pointer drag and selection fallback. The presentation cue does not silently change the engine's acceptance rules or the existing `full-friend`, `wrong-portion` and `no-selection` error contracts.

**Accessibility boundary:** The active station exposes `aria-current="step"` and a descriptive label; the callout uses `role="status"` with polite live updates. Reduced-motion disables the new station/pulse/signal animations while retaining progress and state feedback.

**Verification:** `src/scenarioVisual.test.js`, `npm test` (`298/298`), `artifacts/c19-scenario-before.png`, `artifacts/c19-scenario-after-one.png`, `artifacts/c19-scenario-mobile.png`; desktop and mobile reported no horizontal overflow.

## 2026-08-12 - Rune completion must be a target action, not an answer click

**Decision:** Treat the missing Rune slot as an environmental gate. A tap on a choice selects it and exposes `aria-pressed`; a tap on the missing slot commits the selection, while Pointer drag remains a direct placement path. This makes the affordance consistent with the other direct-manipulation boards.

**Feedback boundary:** Wrong placement keeps the pattern state unchanged and shows a short `wrong` gate pulse/status. Correct placement fills the slot, changes the environment callout and holds the existing completion transition for 640ms so the child can see the result.

**Accessibility boundary:** The missing slot remains a labelled button and exposes a clear no-selection path. `prefers-reduced-motion` removes orbit and wrong-pulse animation but retains the status, filled slot and environment copy.

**Verification:** `src/runeVisual.test.js`, `artifacts/c20-rune-before.png`, `artifacts/c20-rune-wrong.png`, `artifacts/c20-rune-correct.png`, `artifacts/c20-rune-mobile.png`; desktop and mobile reported no horizontal overflow.

## 2026-08-12 - Repair placement must hand energy into the world

**Decision:** Shape Workshop exposes one active repair slot, quieter queued slots and lit progress dots. An accepted placement marks the slot as landed, pulses the machine core/conduit and then leaves the existing filled state as the durable visual result. The same transient feedback is used for tap/select fallback and Pointer drag.

**Boss boundary:** An accepted `completeBossPhase` transition starts a 640ms `is-resonating` handoff on the Boss core. The next phase index is committed only after the handoff window; invalid or duplicate phase completion does not trigger it. This makes the mechanic-to-core relationship legible without changing the Boss engine or progression semantics.

**Accessibility boundary:** Active slots expose `aria-current="step"`; reduced motion removes slot/core/handoff animation while preserving filled, done, active and status states. Mobile keeps the existing touch-sized targets and reported no horizontal overflow.

**Verification:** `src/shapeVisual.test.js`, `src/phaseHandoffVisual.test.js`, `artifacts/c21-shape-before.png`, `artifacts/c21-shape-landed.png`, `artifacts/c21-boss-handoff.png`, `artifacts/c21-boss-mobile.png`.

## 2026-08-12 - Matching must read as a circuit connection

**Decision:** Match keeps one active target group, quieter queued groups and a completed visual state for each accepted pair. The child can drag a number directly to its matching group or select the number and tap the group; both routes share the same pairing rule.

**Feedback boundary:** Accepted pairing briefly pulses the group and energy tethers, while wrong/no-selection stays within the existing error contracts and adds only a local status cue. The existing three-pair completion callback is delayed 640ms only so the connection is visible.

**Accessibility boundary:** The active group exposes `aria-current="step"`, the readout uses a polite status announcement and reduced motion removes animations while preserving active, queued, matched and progress states.

**Verification:** `src/matchVisual.test.js`, `artifacts/c22-match-before.png`, `artifacts/c22-match-landed.png`, `artifacts/c22-match-mobile.png`; desktop and mobile must report no horizontal overflow.

## 2026-08-12 - Nubi signal must be visible without a sprite background

**Decision:** Keep `nubi-transparent-v3.png` and `nubi-evolved-v2.png` as the only runtime sprites, expose a `data-nubi-cutout` marker and force the image layer to use a transparent background. The unused flattened `nubi-hero-v2.png` remains excluded from the evolution registry. Responding/resonant states get a corona and Play panel glow so the companion is legible as an active participant rather than a static sticker.

**Interaction boundary:** Path, Collect and Bridge retain their existing direct-manipulation rules and callback semantics. Each board gets only transient component state for active/queued/landed feedback. Dormant Collect seeds are click-only because they cannot be accepted by the `core` target; lit seeds keep Pointer drag and tap/keyboard fallback.

**Accessibility boundary:** Cutout/asset data is inspectable in the DOM, status text remains polite, active targets expose `aria-current="step"`, and reduced motion removes corona/panel/step animations while preserving visible state and progress.

**Verification:** `src/nubiVisual.test.js`, `src/stepFeedbackVisual.test.js`, `artifacts/c23-nubi-signal.png`, `artifacts/c23-path-landed.png`, `artifacts/c23-collect-landed.png`; browser QA confirmed computed transparent image backgrounds, Nubi responding signal, Path drag completion, Collect wrong/correct feedback, Bridge landing and no horizontal overflow.

## 2026-08-12 - Subtract và Sort phải cho thấy từng bước đã nhận

**Decision:** Giữ rule trừ `6 → 4` và phân loại `small → shallow`/`large → deep`, nhưng làm rõ nhịp thao tác: một token active, các token sau queued, token vừa nhận có landing pulse và vùng đích nhận handoff ngắn. Sai target chỉ tạo soft-fail cục bộ, không làm đổi canonical state.

**Interaction boundary:** Pointer drag là primary; click/select và keyboard/native controls vẫn là fallback. Completion callback được giữ sau một cửa sổ trình bày bounded để trẻ thấy equation/river/nest phản hồi.

**Accessibility and release boundary:** Status dùng `role=status`/`aria-live`, active target vẫn đọc được qua data state; reduced motion tắt animation nhưng giữ state/progress. Không thay engine, reward, mastery, progress, curriculum approval, persistence hay cloud.

**Verification:** `src/stepFeedbackVisual.test.js`, full `npm test` `303/303`, `npm run build:demo`, `artifacts/c24-subtract-landed.png`, `artifacts/c24-sort-landed.png`; browser desktop và mobile `390×844` không overflow.

## 2026-08-12 - Nubi phải là companion nổi trên scene, không phải status pill

**Decision:** Tách `NubiFigure` khỏi surface copy trong Play. Sprite RGBA đứng trên `play-nubi-stage` trong suốt với ground/orbit riêng; text trạng thái đứng trên `play-nubi-copy` có surface phụ. Như vậy người chơi đọc được silhouette và signal của Nubi mà không nhầm một nền chữ nhật là background của nhân vật.

**Interaction boundary:** Khi token hợp lệ đang kéo qua drop zone, `play-nubi-tether` phát beam bounded từ stage về board và copy/stage tăng signal. Đây là phản hồi trực quan cho thao tác, không thay valid-drop allowlist, answer state, click/keyboard fallback, phase, reward hay telemetry.

**Accessibility and motion boundary:** Root vẫn giữ `role=status`/`aria-live`, sprite vẫn có `data-nubi-cutout="true"` và asset marker; reduced motion tắt tether/stage motion nhưng giữ state và target feedback. Không thay canonical mascot asset, curriculum approval, persistence hay cloud.

**Verification:** `src/nubiVisual.test.js`, `artifacts/c25-nubi-floating-desktop.png`, `artifacts/c25-nubi-floating-mobile.png`; browser confirmed transparent root/image backgrounds, larger floating stage, no overlay and no mobile horizontal overflow.

## 2026-08-12 - Direct drag contract phải nhất quán trong RuneBoard và Practice

**Decision:** Daily Weave và Discovery thêm tether presentation-only từ Nubi tới drop zone đang được hover; mobile dùng biến thể dọc. Đồng thời `RuneBoard` cho `leaf`, `sun` và `crystal` cùng dùng allowlist `missing`, để rune sai khi kéo cũng đi qua `wrong-pattern` soft-fail thay vì trở thành click-only.

**Boundary:** Không đổi engine/rule `sun → leaf → crystal`, placement state, error taxonomy, click/keyboard fallback, reward, mastery, progression, curriculum approval, persistence hay cloud. `prefers-reduced-motion` tắt chuyển động nhưng giữ state và status.

**Verification:** `src/nubiVisual.test.js`, `src/runeVisual.test.js`; localhost QA xác nhận Daily Weave và Discovery drag thật, landing state, viewport `390×844` không overflow.

## 2026-08-12 - Mechanic sắp xếp thứ tự phải được duyệt trong sandbox trước

**Decision:** Thêm `src/orderEngine.js` và `OrderBoard` chỉ vào Playtest Lab. Model bounded yêu cầu item kế tiếp đi vào slot kế tiếp; mọi slot trống vẫn là drop target để thao tác sai đi qua cùng `wrong-order` soft-fail thay vì bị chặn âm thầm.

**Interaction boundary:** Token bank được xáo trộn để người duyệt thấy rõ nhu cầu sắp xếp. Pointer drag là primary; select-then-tap và native button/keyboard là fallback. Active/queued/filled/landed state, status text và completion delay chỉ là presentation feedback.

**Release boundary:** `prototype-order` không được thêm vào `nodes`, `INTERACTION_SPECS`, mastery registry, curriculum review packet hay progress schema. Không có reward, XP, persistence, cloud write hoặc production approval nào phát sinh từ prototype.

**Verification:** `src/orderEngine.test.js`, `src/orderVisual.test.js`, `npm test` `308/308`, `npm run build:demo`; browser QA phải xác nhận drag sai/đúng, click fallback và mobile không overflow.

## 2026-08-12 - Prototype registry and Nubi edge cue

**Decision:** Keep prototype-only content in a separate `prototypeNodes` registry. The ordering prototype receives the same interaction-spec validation as a shipped mechanic, but remains outside the 12-node campaign until its learning objective and official evidence are reviewed.

**Visual boundary:** Keep the transparent RGBA Nubi sprites and exclude the flattened hero asset. A masked cutout edge, plus bounded `attention` and `recovering` corona/core cues, improves silhouette and state clarity over bright scenes without adding a background rectangle or changing gameplay state.

**Release boundary:** No prototype progress, mastery, reward, XP, persistence, cloud write, or production approval is created by this slice. Production audit remains fail-closed.

**Verification:** `src/prototypeNodes.test.js`, `src/orderVisual.test.js`, `src/nubiVisual.test.js`, `npm test` `310/310`, `npm run build:demo`, and browser QA through Playtest Lab.

## 2026-08-12 - Pairwise comparison phải tách khỏi sort và order

**Decision:** Add `prototype-compare-pair` only to the local `prototypeNodes` registry. One round shows one small/large pair and one requested relation (`larger` or `smaller`); this closes the outline gap for pairwise comparison without pretending that `sort` already implements level 8 or that `order` is the same mechanic.

**Interaction boundary:** Pointer drag is primary. Selecting a hạt then tapping a relation zone and native button/keyboard are fallbacks. Both relation zones remain drop targets so a wrong answer produces `compare-mismatch` soft-fail and keeps the current round available for retry.

**Visual boundary:** Keep transparent Nubi assets and existing corona/tether/reduced-motion behavior. Lower the full-body `nubi-silhouette` and `nubi-cutout-edge` mask opacity so the cue supports the sprite instead of reading as a second background layer.

**Release boundary:** No campaign node, progress, mastery, reward, XP, persistence, cloud write, curriculum approval or production audit entry is created by this prototype.

**Verification:** `src/comparePairEngine.test.js`, `src/comparePairVisual.test.js`, `npm test`, `npm run build:demo`, and browser QA for wrong/drag/tap/completion plus mobile no-overflow.

## 2026-08-12 - Nhận biết số cần model riêng trong sandbox

**Decision:** Add `prototype-numeral` only to the local `prototypeNodes` registry. The prototype shows one quantity group at a time and asks the child to choose the matching numeral; this fills the outline's standalone numeral-recognition gap without claiming that `collect` or `match` already implements the same learning objective.

**Interaction boundary:** Pointer drag is primary. Selecting a numeral then tapping the core and native button/keyboard are fallbacks. Wrong choices return `wrong-numeral`, keep the current round and increment only a bounded local mistake counter; correct choices advance through three deterministic rounds.

**Release boundary:** No campaign node, progress, mastery, reward, XP, persistence, cloud write, curriculum approval or production audit entry is created by this prototype. Nubi remains a transparent RGBA sprite with bounded visual separation only.

**Verification:** `src/numeralRecognitionEngine.test.js`, `src/numeralVisual.test.js`, `npm test`, `npm run build:demo`, and browser QA for wrong/drag/tap/completion plus the transparent Nubi surface.

## 2026-08-12 - First-session phải dạy nhận biết số trước collect

**Decision:** Nối first-session thành `Oracle → prototype-numeral → collect`. Đây là một bridge local-only để kiểm tra learning seam đúng theo outline; `prototype-numeral` không vào `nodes`, `orderedNodeIds`, mastery registry, progress, reward, XP, persistence, cloud hoặc production curriculum. Nếu prototype malformed/missing, flow fail-closed và đi thẳng vào `collect`.

**Visual boundary:** `NubiFigure` có `.nubi-character` chứa sprite RGBA. Ambient giữ contact shadow và field rất nhẹ; full-body mask giảm còn cue phụ; core/corona/beam được dành cho signal gameplay và drag. Không flatten asset, không thêm nền hình chữ nhật; reduced-motion tắt animation nhưng giữ signal state.

**Verification:** `src/firstSessionFlow.test.js`, `src/firstSessionPrototype.test.js`, `src/nubiVisual.test.js`, full `npm test` `325/325`, `npm run build:demo`; localhost đã kiểm tra `Gọi Tên Số` bằng tap fallback và Pointer drag thật. Production audit tiếp tục fail-closed vì `0 approved` và thiếu official source evidence/human approval.

## 2026-08-12 - LevelRuntime v1 dùng catalog làm data boundary

**Decision:** Giữ catalog 500 level tách khỏi legacy 12-node prototype và thêm `LevelRuntime v1` theo mechanic family. Runtime resolve bằng `mechanicId`, không tạo 500 nhánh React hoặc switch theo level id. App nối Grade 1 Chapter 1 (`g1-l001`…`g1-l010`) qua một campaign boundary riêng; Chapter 2 chỉ hiện là boundary tiếp theo.

**Progression boundary:** Catalog dùng prerequisite chain Grade → Chapter → Level, Knowledge Energy/Shards và restoration/mastery. `xp` chỉ giữ tương thích save, không tham gia unlock. `rewardLedger` làm first-clear reward idempotent; replay chỉ cải thiện evidence.

**Safety boundary:** Completion contract ghi attempts, supports, guided, accuracy, error codes, mastery, phase checkpoints và timestamp. Oracle mặc định là rule-based local Vietnamese hint ladder; không có client Gemini key, chat tự do, leaderboard, timer áp lực hoặc Firebase write.

**Boss boundary:** `g1-l010` có 4 phase và checkpoint từng phase. Failure không reset toàn bộ boss; recovery meter và Oracle support chỉ là cơ chế hồi phục trong session.

**Verification:** `src/runtime/levelRuntime.test.js`, full `npm test` `339/339`, `npm run build:demo`. `agent-browser` CLI không có trong workspace nên dev server được kiểm tra bằng HTTP `200`, headless Chrome dump DOM và Vite build; browser panel đã được mở để reviewer kiểm tra trực quan. Production audit vẫn fail-closed vì curriculum chưa có human official approval.

## 2026-08-12 - Catalog grades phải chạy bằng mechanic data, boss phải review đúng game đã học

**Decision:** Runtime không giới hạn ở `g1-l001`…`g1-l010`. `CatalogCampaignView` duyệt được 5 lớp × 10 chương; `levelRuntimeContent` sinh content deterministic theo `mechanicId`, còn content review cụ thể được ưu tiên khi có. Không tạo switch theo 500 `levelId`.

**Boss boundary:** Boss lấy source mechanics từ `boss.reviewLevelIds`, chọn đều theo `phaseCount` và gắn label theo mechanic thật. `g1-l010` dùng `collect → path → simulation → observation`; Grand Boss dùng 6 phase. `BossRenderer` lấy `phaseIndex` từ runtime state/checkpoint, không giữ một phase index React riêng có thể lệch checkpoint.

**Review boundary:** Level khóa có `Thử bản review`. Review-only chỉ cho kiểm tra thao tác và logic, không ghi completion, unlock, checkpoint hoặc reward. Campaign thật vẫn kiểm tra prerequisite.

**Build boundary:** `npm run build` là review build (`audit:curriculum` + `vite build`) để reviewer luôn build được prototype. `npm run build:production` giữ curriculum approval gate và tiếp tục fail-closed khi chưa có human official approval.

**UX boundary:** Mỗi mechanic hiển thị mục tiêu, 3 bước thao tác và quy tắc ngắn; visual count/choice lấy từ content thay vì số minh họa hard-code. Oracle local vẫn là fallback mặc định.

**Verification:** `npm test` `339/339`, `npm run build`, browser QA đã hoàn tất `g1-l010` qua 4 phase/checkpoint, kiểm tra Grade 5 Grand Boss 6 phase và review level ở Chapter 2; không có Vite overlay hoặc console error.
