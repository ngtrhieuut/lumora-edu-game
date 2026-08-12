# 11 — Design Next Actions

Các concept image đã đủ để chuyển từ brainstorm sang convergence. Không tiếp tục generate hình ngẫu nhiên; mỗi vòng tiếp theo phải giải quyết một decision cụ thể.

## Priority P0 — trước khi code gameplay

### A. Character Originality Pass

Mục tiêu:
- chọn 1 Linh Thú MVP;
- giữ emotional appeal;
- loại cảm giác fox/deer/Pokémon-like;
- tạo anatomy signature có thể nhận biết bằng silhouette;
- phân biệt Oracle rõ với Linh Thú.

Output cần:
- 6–8 silhouette refined;
- 3 color/material directions;
- 1 canonical starter;
- 1 evolution line giữ identity;
- 1 Oracle design riêng biệt.

### B. HUD Simplification Pass

Refine scenes 10, 12–19.

Rule:
- 1 primary objective;
- 1 progress indicator;
- tối đa 1 visible currency;
- parent/settings secondary;
- reward text tối giản.

### C. Gameplay Integration Pass

Ưu tiên redesign:
1. Light Bridge — bỏ answer tiles, thao tác trực tiếp với crystal.
2. Rune Path — bỏ equation-as-option ở early game.
3. Sorting Stream — giảm text dependency.
4. Shape Workshop — biến shape recognition thành repair/construction.
5. Scenario Simulation — thay story problem bằng NPC/environment simulation.
6. Boss — dùng lại mechanics đã học thay vì floating equations.

### C1. Slice status - 2026-08-11

- Light Bridge: implemented as direct crystal-to-bridge repair circuit.
- Rune Path: polished as a visual rhythm gate with a connected sequence, missing slot and rune tray.
- Sorting Stream: refined with size-coded pebbles, shallow/deep river banks and a compact progress cue; pointer drag remains primary.
- Shape Workshop: implemented as a machine repair/construction board with three geometric slots.
- Scenario Simulation: implemented as a five-station campfire simulation with a 2+3 serving target.
- Mixed/Challenge: now exposed in Playtest Lab with distinct phase identity shells while reusing the canonical mechanic components.
- Boss: integrated as a restorative three-phase sequence that reuses collect, bridge/add and rune/pattern mechanics; phase state is immutable and fail-closed.
- Nubi feedback: gameplay state machine now distinguishes idle, curious, hint, soft-fail, phase-complete and resonant; PlayView keeps a compact companion signal visible during interaction.
- Nubi signal: local `ambient → attention → responding → resonant → recovering` adds a bounded beam/burst response for action, hint, soft-fail, phase completion and success; alpha cutout margins are covered by an asset contract test.
- Playtest Lab: all 12 Main Quest nodes are directly previewable, including Match, Path and Subtract, without writing child progress.
- Daily Adventure resume: local date-bound session state keeps queue, current challenge, completed results and phase; Home resumes safely after exit/reload without persisting board internals or granting replay rewards.
- Oracle error-aware hints: normalized board failures now select targeted hint ladders by `errorCode`, retain generic fallback, and keep allowlisted telemetry free of child identity data.
- Onboarding map entry: the first-time flow now lands on the Adventure Map with a first-memory callout and highlighted first node before gameplay begins.
- World blueprint preview: the next World is navigable from the map as a read-only concept screen with explicit `PREVIEW` and curriculum-evidence gate; it cannot activate nodes or grant progress.
- Pointer drag feedback: each token now exposes a valid drop-zone allowlist; only the matching target highlights during drag, a valid landing gets a short pulse, and a cancelled/invalid drag suppresses the synthetic tap while click/keyboard remain intentional fallbacks.
- Success burst layering: Nubi, the resonance icon and completion copy use separate visual layers inside a viewport-bound overlay, preventing completion text from crossing the character or falling below the visible play area.
- Energy resonance: Nubi đọc category từ node/reward bằng pure model; dải màu ambient xuất hiện trong board, còn success/restoration dùng intensity 2 và hiển thị mạch vừa nhận mà không sửa reward/mastery.
- Drag affordance: common `DragToken` now exposes `data-drag-source`/`data-dragging`, grab cursor and focus-visible styling; direct manipulation remains primary with click/keyboard fallback.
- C04 originality review: generated a review-only six-direction concept sheet at `artifacts/nubi-c04-originality-pass-2026-08-11.png`; no variant is canonical or wired into runtime until explicit selection and alpha/silhouette QA.
- Child gameplay HUD focus mode: active play/quest/practice screens keep the world progress stream, one XP signal and settings; map/creature/city navigation, session reminder and shard currency stay secondary and are removed from the child-facing play header.
- Daily Adventure drag affordance: valid-target hover and landing feedback now cover both `.game-board` and `.discovery-board`; the local discovery route keeps click/keyboard fallback and reduced-motion behavior.
- First-session Oracle bridge: sau awakening, child-facing flow có một Oracle local ngắn với hai lựa chọn `Bắt đầu`/`Bỏ qua`, tự động mở Level 1 rồi trả về Map sau restoration; không thêm persistence, reward hay cloud dependency.
- Learning Proof Loop: Parent Dashboard now joins the latest normalized local activity record to the canonical node registry and shows objective, first-clear/latest practice, mastery, attempts, support use and duration without inventing curriculum claims or sending cloud data.

### C2. First-session continuation - 2026-08-11

- Level 1 restoration now seeds a local continuation state and makes `Cổng Ghép Đôi` the explicit next action on Map.
- `MechanicIntroView` presents the canonical Match objective and drag gesture before opening Level 2; skip is bounded to the same level, not a reward bypass.
- Match completion shows a non-unlocking boss tease, then returns to Map with the next prerequisite-driven node active.
- Nubi depth pass adds a grounded contact shadow and depth-varied particles/orbits while retaining transparent RGBA runtime assets.
- Browser evidence covers desktop continuation, Match drag completion, boss tease, mobile `375×812` no-overflow and mobile first-session continuation CTA.

### C3. Mastery Arc và interaction affordance - 2026-08-11

- `src/masteryArc.js` tạo contract canonical cho `skillId`, activity, context, variant, prerequisite và World boundary; registry dùng lại Main, Daily, Quest và phase config thay vì thêm một board cô lập.
- First-session target `Level 1 → Match` được chọn từ ordered registry policy; Daily Adventure dùng cùng policy để chọn tối đa ba direct activities đã hoàn tất, ưu tiên mastery yếu và không cấp first-clear reward.
- Completion local ghi activity identity/context/variant để Parent Dashboard có thể hiển thị evidence qua nhiều ngữ cảnh; dữ liệu không chứa alias, age band, raw answer hay PII.
- `RuneBoard` giữ click/keyboard fallback nhưng cho cả rune đúng và sai đi qua cùng drop target để soft-fail nhất quán; Discovery fallback chỉ đánh dấu slot thuộc allowlist của fragment; label mobile được phép wrap thay vì ellipsis.
- Nubi giữ PNG RGBA transparent nhưng thêm silhouette rim theo alpha thật, ambient halo thu hẹp và contact shadow căn theo visible feet.
- Verification mới: `npm test` `257/257`; `npm run build:demo` pass `51 modules`; browser xác nhận Mastery Arc panel, rune click-only (`data-drag-source=null` cho leaf/sun), mechanic intro mobile `375×812` không overflow và không có page errors.

## Priority P1 — sau khi P0 khóa

### D. Interaction specs

Mỗi gameplay cần file spec gồm:
- learning objective;
- entry state;
- objects;
- gestures;
- rules;
- success;
- soft-fail;
- hint 1/2/3;
- mastery events;
- animation;
- audio;
- exit state.

### E. First 15-minute clickable prototype

Chỉ cần:
- launch;
- awakening;
- Oracle;
- map;
- 2 mechanics;
- restoration;
- reward;
- boss tease.

Không cần Firebase/Gemini live ở prototype UI đầu tiên.

## Priority P2 — AI Riser vertical slice

Sau khi UX/playtest ổn:
- integrate Gemini Oracle;
- Firebase progress/mastery;
- 5 gameplay mechanics;
- boss;
- evolution;
- small Knowledge City;
- parent dashboard.

## Deferred

- Full League.
- Full creature collection.
- Multiple currencies/economy.
- Multiplayer.
- Real-time social.
- Multiple grade worlds playable.

## Decision gate trước engineering

Không bắt đầu full build cho đến khi:
- canonical creature được chốt;
- Home v0.2 được chốt;
- 5 gameplay mechanics có interaction spec;
- first 15-minute flow được chốt;
- scene 17 được redesign;
- boss phases mapping với gameplay đã học.

### C4. Environmental Restoration và Nubi depth pass - 2026-08-11

- `src/resourceRoutingEngine.js` là engine pure cho resources → connected destinations; config/state normalize immutable, capacity và wrong-route fail-closed, không giữ PII hoặc raw answer.
- `Bến Hạt Trôi` là Side Quest đầu tiên dùng route model thay vì lặp lại Sorting board; bốn hạt đi qua hai bờ, completion mở cosmetic quest riêng và không chặn 12 Main Quest.
- `ResourceRouteBoard` giữ drag primary, target allowlist theo từng kind, click/tap/keyboard fallback và error hint riêng cho wrong-route/capacity.
- Nubi thêm two-layer contact shadow, alpha-bound rim silhouette và foreground sparks; transparent RGBA asset vẫn là runtime source, reduced-motion tiếp tục tắt animation.
- Evidence: `artifacts/resource-route-quest.png`, `artifacts/resource-route-mobile.png`, `artifacts/nubi-creature-resource-model.png`.
- Verification: `npm test` `265/265`; `npm run build:demo` pass `52 modules`; browser xác nhận drag thật tăng progress, mobile `375×812` không overflow và không có page errors.

### C5. Environmental Restoration simulation và City restoration log - 2026-08-11

- `src/environmentRestorationEngine.js` là engine pure cho biến môi trường bounded; config/state deep-freeze, clamp, action budget/max uses, drift classification và privacy boundary đều được test riêng.
- `Vạt Cỏ Đom Đóm` chuyển optional quest `firefly-pairs` sang `restore`: Nước bắt đầu `1/3` cần về `2`, Ánh sáng bắt đầu `2/3` cần về `1`; bốn dụng cụ có target allowlist theo biến và dùng được bằng pointer drag, tap hoặc keyboard.
- `EnvironmentRestorationBoard` hiển thị ecosystem scene, target marker, landing pulse và `aria-live` instruction; wrong target/drift đi qua hint ladder riêng, còn completion giữ nguyên local quest boundary.
- Knowledge City có `Nhật ký hồi sinh`, đọc `questState.completedIds` để hiển thị `Vạt Cỏ Đom Đóm hồi sinh` mà không biến cosmetic hay feature thành learning reward mới.
- Evidence: `artifacts/environment-restoration-desktop.png`, `artifacts/environment-restoration-mobile.png`, `artifacts/city-restoration-feature.png`, `artifacts/city-restoration-mobile.png`.
- Verification: focused contract `9/9`; full `npm test` `276/276`; `npm run build:demo` pass với `53 modules`; browser xác nhận wrong target fail-closed, pointer drag `1/6`, completion bằng drag, city log sau completion, viewport `390×844` `scrollWidth > innerWidth = false`, không có page errors.

### C6. Daily Adventure puzzle chuyển mạch - 2026-08-11

- `src/dailyWeaveEngine.js` tạo challenge deterministic từ Daily queue, giữ token/lane/capacity/action budget trong contract immutable, fail-closed và privacy-safe.
- `DailyWeaveView` là một gameplay model riêng: token ký ức đi vào lane năng lượng tương ứng, lane hợp lệ highlight khi kéo, landing pulse xuất hiện sau drop và action budget ngăn vòng đoán vô hạn.
- Flow thực tế đã kiểm tra `Home → queue replay → checkpoint → Dệt Mạch Năng Lượng → Mạch Ký Ức`; drag Pointer Events pass ở desktop/mobile, click fallback pass, `scrollWidth = clientWidth` ở viewport `390×844`, console không có page errors.
- Evidence: `artifacts/daily-weave-desktop.png`, `artifacts/daily-weave-mobile.png`.
- Verification: focused Daily/lifecycle suite `46/46`; full `npm test` `286/286`; `npm run build:demo` pass với `54 modules`. `npm run build` vẫn fail-closed vì `12 nodes, 0 approved, 36 errors, 0 warnings` cho tới khi có official curriculum evidence và human approval.

### C7. City world-state projection - 2026-08-11

- `src/restorationProjectionEngine.js` biến completed optional quest ids thành projection immutable, fail-closed và không chứa PII/raw answer. Projection chỉ nhận feature metadata trong allowlist và gộp energy types canonical cho feedback Nubi.
- Knowledge City thêm `Bản đồ sống quanh thành phố`: vùng `firefly-grove` và `river-bank` có trạng thái dormant/restored khác nhau bằng visual cue, particle, glow và river shimmer; restoration log vẫn giữ vai trò bằng chứng lịch sử.
- Restoration summary nói rõ vùng vừa hồi sinh; Nubi trong City đọc các mạch môi trường ở ambient intensity. Không có reward, mastery, XP, Main Quest prerequisite hoặc cloud write mới.
- Focused projection tests bao phủ malformed completed ids, unknown feature/energy, immutability và privacy boundary; browser phải kiểm tra City desktop/mobile và `scrollWidth === clientWidth`.

### C8. Resource route live projection - 2026-08-11

- `ResourceRouteBoard` đọc target allowlist từ `resourceRoutingEngine` khi trẻ chọn hạt; tuyến đúng được highlight,
  tuyến không phù hợp giảm intensity và copy trạng thái nói rõ hạt đang chờ tuyến nào.
- Không thêm answer state hoặc gợi ý kích thước mới: click/keyboard fallback, drag Pointer Events, capacity và
  wrong-route boundary giữ nguyên.
- Browser evidence: `artifacts/resource-route-active-small.png`, `artifacts/resource-route-active-mobile.png`; desktop
  và viewport `390×844` xác nhận tuyến nhỏ sáng, tuyến sâu hạ opacity, không overflow và không có page error.

### C9. Evolution reuses the canonical Nubi visual contract - 2026-08-11

- `EvolutionView` dùng `NubiFigure` cho hình thái đích thay vì một `<img>` rời, nên sprite RGBA, silhouette rim,
  contact shadow, core flare, orbit, resonance ribbon và signal burst đồng nhất với Home/Play/City.
- Hình thái cũ vẫn là sprite transition riêng để giữ cảm giác shed/reveal; cinematic không đổi stage trigger, reward,
  mastery hoặc curriculum boundary.
- Browser evidence: `artifacts/nubi-evolution-layered-desktop.png`, `artifacts/nubi-evolution-layered-mobile.png`;
  desktop/mobile hiển thị Nubi không có nền chữ nhật, stage 2 signal `resonant`, energy intensity `1` và không có page error.

### C10. Drag attention và Oracle soft-fail presence - 2026-08-11

- `oraclePresence` nhận event `soft-fail` thật từ `PlayView`: Mạch materialize nhẹ sau thao tác lệch, rồi chỉ chuyển sang `teaching` khi policy auto-hint hoặc trẻ chủ động gọi gợi ý.
- Khi một token đang được kéo, Nubi trong Main Quest, Daily Weave hoặc Discovery chuyển sang attention mode bằng `data-dragging`: core glow, beam, foreground sparks và nhịp nổi nhẹ; không chiếm drop target và không gợi đáp án mới.
- Contract vẫn local-first, bounded và reduced-motion safe; không thêm state persistence, telemetry PII, reward, mastery hoặc curriculum boundary.
- Verification cần bao gồm `soft-fail → materializing → teaching`, drag visual selector và mobile no-overflow trên ít nhất một Main Quest board và Daily Adventure.

### C11. Oracle support loop cho Daily Weave và Discovery - 2026-08-11

- `OracleSupportDock` trở thành visual contract dùng chung cho Main Quest, `DailyWeaveView` và `PracticeDiscoveryView`; hai màn luyện tập không tạo nhánh UI Mạch riêng.
- Lỗi `wrong-lane`, `full`, `max-actions`, `wrong-slot` và `no-selection` đi qua cùng state machine `soft-fail → materializing → teaching`; hint ladder lấy từ local rule-based provider, không gọi Gemini.
- Gợi ý chỉ tăng dần theo yêu cầu hoặc policy auto-hint, không auto-place, không guided completion, không ghi mastery/reward/XP/curriculum/cloud; completion đi qua `level-success → dissolving` trước khi chuyển màn.
- Nubi phản chiếu cùng trạng thái Oracle bằng mood `soft-fail`, `hint` và `resonant`; drag/click/keyboard fallback của hai board vẫn giữ nguyên.
- Verification: `src/oracleSupport.test.js`, full `npm test` `295/295`, `npm run build:demo` pass với Vite `55 modules`; browser smoke xác nhận auto-hint `1/3`, request tới `3/3` bị khóa an toàn, wrong-slot và completion của cả hai màn.

### C12. Home Nubi presence và focus interaction - 2026-08-11

- Home truyền `mood` theo context: stage 1 + chặng kế tiếp dùng `curious`, stage 2 dùng `resonant`; `energyTypes` của node kế tiếp đi vào cùng Nubi resonance model thay vì render một sprite idle vô ngữ cảnh.
- Hover, keyboard focus và press tác động lên toàn bộ layered `NubiFigure`, không chỉ `<img>`; điều này tránh việc animation sprite ghi đè transform và làm mất cảm giác Nubi đang đáp lại người chơi.
- Focus ring giữ khả năng điều khiển bằng keyboard; không thêm asset mới, không thay canonical mascot, không ghi progress/reward/curriculum/cloud.
- Verification cần kiểm tra Home desktop/mobile: `data-nubi-mood`, `data-energy-type`, focus/hover transform, alpha background và reduced-motion.
### C13. Play Nubi prominence và reduced-motion signal policy - 2026-08-11

- Signal Nubi trong `PlayView` tăng từ icon `58×58px` thành figure `104×104px` trên desktop và `88×88px` trên breakpoint nhỏ; thay đổi này dùng chung cho Main Quest, Quest Play và Practice Play, không đổi asset hoặc mechanic.
- Thêm một vùng aura radial phía sau figure và giữ copy signal trong cùng surface để Nubi là companion có mật độ hiện diện thực, không phải badge nhỏ gắn cạnh mục tiêu.
- `prefers-reduced-motion` giữ static aura, ribbon, spark và particle để không làm mất feedback; beam, burst và resonance wave được ẩn hoàn toàn vì đây là cue chuyển động.
- Boundary không đổi drag allowlist, click/keyboard fallback, Oracle hint, reward, mastery, XP, progress hay curriculum/cloud.
- Verification: focused Nubi visual tests, full suite, `npm run build:demo`, browser desktop/mobile Play và reduced-motion.
### C14. Mobile Nubi composition và stacking safety - 2026-08-11

- Restoration giữ khoảng thở riêng cho Nubi trước `restore-card`, tránh card z-index cao phủ lên thân/chân ở viewport nhỏ; figure không nhận pointer để không cản thao tác trên card.
- City hạ chân figure lên trên panel `Đang trang bị`, giữ contact shadow và silhouette nhìn thấy trong stage; Practice intro, Daily Weave và Discovery đưa Nubi vào vùng nhìn thấy thay vì đẩy phần lớn figure ra ngoài parent clip.
- Evolution reduced-motion đưa sprite cũ xuống/ẩn và giữ target Nubi ở lớp trên để kết quả không phụ thuộc vào animation đã bị tắt.
- Boundary không đổi interaction contract, drag/click/keyboard fallback, quest completion, reward, mastery, XP hay curriculum/cloud.
- Verification: browser viewport `390×844` cho Restoration/City/Practice, no horizontal overflow, reduced-motion Evolution và full regression.
### C15. Home mobile effect bounds và keyboard focus - 2026-08-12

- Home mobile giữ `.nubi-hero` trong parent scene thay vì đẩy figure ra ngoài cạnh phải; aura ribbon và signal beam được thu về bounds của figure để `.scene { overflow: hidden }` không cắt mất feedback.
- Focus ring trên viewport nhỏ dùng offset ngắn hơn, vẫn giữ keyboard affordance nhưng không bị clip; asset RGBA, signal state và visual effects không đổi.
- Boundary không đổi navigation, progress, reward, mastery, curriculum hay cloud.
- Verification: Home `390×844`, focus-visible, effect bounds, alpha background và no horizontal overflow.
### C16. Optional quest curriculum and registry hardening - 2026-08-12

- Optional quests now expose the same release-facing fields as Main nodes: grade, subject, domain, difficulty, gameplay template, mastery events, prototype source and explicit `approved: false`.
- `auditOptionalQuestRegistry()` validates World ownership, source-node boundaries, external Main-node prerequisites, scenario back-links, City restoration features and quest cosmetic unlocks without mutating progress or granting approval.
- `audit-curriculum.mjs` and the read-only review packet include all 12 Main nodes plus 3 optional quests. Prototype audit passes; production remains fail-closed until official curriculum evidence and human approval exist for every entry.
- Boundary: optional quests remain non-blocking Side/Secret content; this slice changes validation and review visibility, not reward, mastery, cloud, or progression semantics.

### C17. Awakening feedback loop for Nubi - 2026-08-12

- Onboarding now gives the first touch a visible rhythm: the player touches the Knowledge Shard, Nubi enters a short resonant signal, and only then does the flow continue to the first-session Oracle.
- The awakening scene reuses the canonical transparent `NubiFigure`, with curious ambient resonance before the touch and a bounded halo, orbit, beam, burst and core flare during the resonant state. The shard disables itself during the transition to prevent duplicate submits.
- Reduced-motion keeps the state change and static visual layers but disables the awakening/aura/shard animations. No new mascot asset, curriculum claim, reward, mastery, progress, persistence or cloud/API dependency is introduced.
- Verification must cover the pre-touch and resonant DOM states, timer cleanup, duplicate-click protection, transparent sprite contract and desktop/mobile no-overflow.

### C18. Practice resonance follows the active learning thread - 2026-08-12

- Practice Intro, Daily Weave and Discovery now pass their active node/fragment energy types into `NubiFigure`, so the companion's ribbon color and resonance label follow the local session instead of falling back to a neutral idle figure.
- The change is derived from canonical queue/challenge/source-node data and does not infer a new learning result. Existing Oracle mood, drag targets, click/tap/keyboard fallback and completion timers remain unchanged.
- Boundary: presentation-only, local-first, reduced-motion safe; no new asset, reward, mastery, XP, curriculum approval, persistence or cloud/API dependency.
- Verification must cover all three visual context bindings, full test/build regression and at least one Daily/Discovery browser pass without horizontal overflow.

### C19. Scenario world-action loop - 2026-08-12

- `ScenarioBoard` now exposes one active waiting station at a time; queued stations are visually quieter and served stations remain readable as completed world state.
- Each accepted delivery lights one campfire progress dot, adds a bounded served pulse and updates the local callout with the next need. The existing 2+3 count engine, error contracts and tap/select/Pointer drag fallback remain unchanged.
- Boundary: presentation-only and local-first; no new asset, curriculum claim, reward, mastery, XP, persistence or cloud/API dependency.
- Verification: `src/scenarioVisual.test.js`, `npm test` (`298/298`), desktop before/after screenshots, mobile `390×844` and no horizontal overflow.

### C20. Rune environmental gate - 2026-08-12

- The missing Rune slot is now a real target for both interaction modes: selecting a rune only marks it, then tapping the slot commits it; Pointer drag can still place the rune directly.
- Wrong placement gives a bounded gate shake/status response. Correct crystal fills the slot, changes the forest callout to `Cổng đã cộng hưởng`, and delays the existing completion callback by 640ms so the result is visible.
- Boundary: presentation and interaction affordance only; the canonical `sun → leaf → crystal → sun → leaf → crystal` rule, error taxonomy and progression/reward/curriculum/cloud boundaries remain unchanged.
- Verification: `src/runeVisual.test.js`, focused test pass, desktop idle/wrong/correct screenshots, mobile `390×844` with no horizontal overflow and corrected environment-copy layout.

### C21. Shape repair and Boss energy handoff - 2026-08-12

- Shape Workshop now marks one module as active, keeps later modules queued, lights a bounded progress dot after accepted placement and pulses the machine core/conduit as the shape lands. Select/tap and Pointer drag share the same feedback.
- Boss phase completion is now a visible energy handoff: only an accepted `completeBossPhase` transition starts the 640ms `is-resonating` core state; then the existing phase index/checkpoint/completion transition continues.
- Boundary: UI/state presentation only; no changes to shape/boss engines, phase order, telemetry, reward, mastery, progress, curriculum approval or cloud/API providers.
- Verification: `src/shapeVisual.test.js`, `src/phaseHandoffVisual.test.js`, desktop Shape/Boss browser evidence, mobile Boss `390×844` and no horizontal overflow.

### C22. Match pairing circuit - 2026-08-12

- `MatchBoard` now exposes the next group as `active`, later groups as `queued`, and matched groups as a readable completed circuit. The readout states whether the child should drag or select a number before touching its group.
- Accepted pairing gives the group a bounded landing pulse and briefly brightens the energy tethers; the existing three-pair rule and `onFinish` callback remain unchanged apart from a 640ms presentation window.
- Wrong/no-selection attempts keep the existing `quantity-mismatch`/`no-selection` contracts and add only a local status/shake cue. Pointer drag remains primary, with tap/keyboard fallback and reduced-motion-safe states.
- Boundary: presentation and interaction affordance only; no new answer, reward, mastery, progress, curriculum approval or cloud/API state.
- Verification: `src/matchVisual.test.js`, full regression, demo build, desktop drag/click pairing and mobile no-overflow evidence.

### C23. Nubi cutout signal and board step feedback - 2026-08-12

- `NubiFigure` now exposes an explicit `data-nubi-cutout="true"`/asset marker, forces transparent image compositing and adds a signal corona plus Play panel glow when the companion responds or resonates. The runtime still uses only the two RGBA sprites; the flattened hero concept remains out of the registry.
- `PathBoard`, `CollectBoard` and `BridgeBoard` now expose transient `active/queued/landed` state after each accepted step. Correct actions pulse the newly connected slot/core/river; dormant Collect seeds are click-only so the UI does not promise an invalid drag target.
- Wrong actions keep the existing error codes and canonical state rules, while adding local soft-fail feedback. All timers clean up on unmount, completion callbacks remain bounded and reduced motion keeps static state without animation.
- Boundary: presentation and interaction affordance only; no engine, telemetry, mastery, reward, progress, curriculum approval, persistence or cloud/API change.
- Verification: `src/nubiVisual.test.js`, `src/stepFeedbackVisual.test.js`, browser checks for Nubi cutout/computed transparent background, Path drag completion, Collect wrong/correct feedback, Bridge landing and no horizontal overflow.

### C24. Subtract và Sort step feedback - 2026-08-12

- `SubtractBoard` exposes the next firefly as active, later fireflies as queued and a returned firefly as landed. The nest and equation receive a bounded resonance or soft-fail cue; completion waits briefly so the child can see `6 − 2 = 4` settle.
- `SortBoard` exposes the next pebble and receiving bank as active, later items as queued, and the accepted pebble/bank/river handoff as a bounded landing state. Wrong-bank feedback keeps the existing size rule and error contract.
- Pointer drag remains primary on both boards; select-then-tap and keyboard/native controls remain fallbacks. No engine, reward, mastery, progress, curriculum approval, persistence or cloud boundary changes.
- Verification: `src/stepFeedbackVisual.test.js`, full `npm test` (`303/303`), `npm run build:demo`, desktop landing evidence and mobile `390×844` no-overflow checks.

### C25. Nubi floating companion và drop tether - 2026-08-12

- PlayView no longer renders Nubi as a single dark status pill. `play-nubi-stage` is a background-free visual anchor with a contact ground/orbit; status copy is separated into `play-nubi-copy` so the sprite reads as a character in the scene.
- While a valid Main Quest token is dragged over a drop zone, `play-nubi-tether` becomes a bounded beam toward the board and the stage/copy intensify. The selector covers direct boards and all Mixed/Challenge/Boss phases through the shared `.game-board` surface.
- The canonical RGBA sprites remain unchanged; this slice changes only composition and transient visual feedback. Pointer drag, tap/select, keyboard fallback, error taxonomy, phase engine, reward, mastery, curriculum approval and cloud boundaries remain unchanged.
- Verification: `src/nubiVisual.test.js`, desktop/mobile computed transparent backgrounds, floating-stage screenshots, drag-attention/drop-tether CSS contract and mobile `390×844` no-overflow.

### C26/C27. Practice tether và Rune drag parity - 2026-08-12

- Daily Weave và Discovery dùng cùng tether presentation-only từ Nubi tới drop zone đang hover; mobile chuyển tether thành trục dọc để không che board.
- `RuneBoard` cho `leaf`, `sun` và `crystal` cùng dùng drop target `missing`, để rune sai đi qua `wrong-pattern` soft-fail thay vì bị biến thành click-only. Click/keyboard fallback, reduced motion, rule pattern, reward, mastery, progression và curriculum/cloud boundary giữ nguyên.
- Verification: `src/nubiVisual.test.js`, `src/runeVisual.test.js`; localhost QA xác nhận Daily Weave và Discovery drag thật, landing state và mobile `390×844` không overflow.

### C28. Prototype sắp xếp thứ tự trong Playtest Lab - 2026-08-12

- `src/orderEngine.js` là engine bounded cho chuỗi thứ tự: chỉ dấu đang đến lượt và ô kế tiếp được chấp nhận; item/slot sai tạo `wrong-order` soft-fail và không làm thay đổi placement đã đúng.
- `OrderBoard` đưa model này vào Playtest Lab với token bank bị xáo trộn, drag trực tiếp tới mọi ô trống, select-then-tap, native button/keyboard fallback, active/queued/filled/landed state và reduced-motion-safe feedback.
- Prototype được đánh dấu rõ `prototype · chưa ghi tiến trình`; không thêm node vào `nodes`, không thêm interaction spec/curriculum registry, không cấp reward, mastery, XP, persistence hay cloud state. Đây là sandbox để duyệt cảm giác của mechanic “sắp xếp thứ tự” trước khi có objective và evidence chính thức.
- Verification: `src/orderEngine.test.js`, `src/orderVisual.test.js`, full `npm test` (`308/308`), `npm run build:demo`, browser QA desktop/mobile và no horizontal overflow.

### C29. Prototype registry, order contract và Nubi edge cue - 2026-08-12

- `prototype-order` đã tách vào `src/prototypeNodes.js`; Playtest Lab render từ registry local-only, còn 12 Main Quest nodes và progress schema giữ nguyên.
- `order` đã có interaction spec với Pointer drag là primary, select-then-tap/native keyboard là fallback. `sort` tiếp tục giữ semantics compare/classify kích thước; không trộn với ordering trước khi có curriculum evidence.
- Nubi giữ hai sprite RGBA trong suốt; `nubi-cutout-edge` dùng mask để tách silhouette khỏi scene sáng, còn `attention`/`recovering` có cue corona/core bounded và reduced-motion-safe.
- Boundary: không thêm prototype vào production curriculum, mastery, reward, XP, persistence hay cloud.
- Verification: `npm test` (`310/310`), `npm run build:demo`, HTTP `200`, browser QA wrong-order, Pointer drag, select-then-tap và completion prototype.

### C30. Pairwise comparison prototype và Nubi halo correction - 2026-08-12

- `prototype-compare-pair` bổ sung model so sánh từng cặp lớn hơn/nhỏ hơn trong Playtest Lab, tách rõ khỏi `sort` (phân loại nhiều hạt) và `order` (sắp xếp trình tự).
- `src/comparePairEngine.js` giữ ba round bounded; Pointer drag là primary, chọn rồi chạm và native keyboard là fallback. Sai giữ round hiện tại với `compare-mismatch`; đúng mới chuyển round.
- Nubi vẫn dùng sprite RGBA trong suốt, nhưng giảm opacity của silhouette/cutout mask full-body để cue nổi vừa đủ và không bị cảm nhận như background. Corona, tether và reduced-motion boundary giữ nguyên.
- Boundary: prototype không vào `nodes`, campaign, mastery, reward, XP, persistence, cloud hoặc production curriculum; không có official approval suy ra từ prototype.
- Verification cần đạt: `src/comparePairEngine.test.js`, `src/comparePairVisual.test.js`, full `npm test`, `npm run build:demo`, browser wrong/drag/tap/completion và mobile no-overflow.

### C31. Prototype nhận biết số trong Playtest Lab - 2026-08-12

- Thêm `prototype-numeral` với ba round bounded để kiểm tra mục tiêu nhận biết chữ số qua số lượng, tách khỏi `collect` và `match`.
- `NumeralRecognitionBoard` dùng Pointer drag làm primary; select-then-tap và native button/keyboard là fallback. Sai giữ round hiện tại với `wrong-numeral`; đúng mới advance và completion callback.
- Nubi giữ asset RGBA trong suốt; silhouette/cutout mask giảm opacity để nổi vừa đủ trên scene. Không thêm background rectangle, campaign progress, mastery, reward, XP, persistence, cloud hay production approval.
- Verification: `src/numeralRecognitionEngine.test.js`, `src/numeralVisual.test.js`, full `npm test`, `npm run build:demo` và browser QA Playtest Lab.
