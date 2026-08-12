# LevelRuntime v1

## Mục tiêu

`LevelRuntime v1` là runtime data-driven cho catalog 500 level. Catalog giữ learning intent và prerequisite; runtime chọn mechanic family, renderer và pure state engine. Level id không được dùng làm nhánh React.

Luồng reviewable trong App:

`catalog-map → grade/chapter → catalog level → mechanic renderer → normalized learning evidence → Knowledge Energy/Shards → restoration/reward → catalog-map`

Tất cả 500 row có thể mở ở chế độ `Thử bản review`; prerequisite chỉ áp dụng cho campaign thật. Nội dung curriculum vẫn là prototype mapping và không tự động được approve.

## Các lớp

- `src/runtime/levelRuntimeEngine.js`: state machine thuần cho attempts, actions, supports, guided state, error codes, accuracy, mastery, phase checkpoint và normalized result.
- `src/runtime/levelRuntimeAdapter.js`: resolve một catalog level thành renderer family, content, boss phase sequence và review references.
- `src/runtime/levelRuntimeRegistry.js`: registry renderer theo `mechanicId`; unknown mechanic trả fallback fail-closed.
- `src/runtime/levelRuntimeContent.js`: content deterministic theo mechanic cho cả 500 row; content review cụ thể của Grade 1 được ưu tiên, tách khỏi catalog và React.
- `src/runtime/levelRuntimeRenderers.jsx`: các renderer family touch-first: collect, slot-fill, sort, path, build-repair, simulation, match, sequence, observation, data/lab và boss.
- `src/runtime/LevelRuntime.jsx`: shell generic quản lý session state, Oracle local, support ladder, duration, completion và checkpoint callback.
- `src/runtime/catalogProgression.js`: progress schema v1, prerequisite unlock, Grade → Chapter → Level progress, first-clear reward ledger và replay evidence.
- `src/runtime/CatalogCampaignView.jsx`: map 5 grade × 10 chapter, campaign action và review-only action để reviewer trải nghiệm mà không mở rộng legacy 12-node shell.

## Normalized completion contract

Mỗi lần hoàn tất gửi contract ổn định:

```js
{
  levelId,
  skillId,
  mechanicId,
  completed,
  attempts,
  supportsUsed,
  guided,
  actions,
  durationSeconds,
  accuracy,
  errorCodes,
  mastery,
  completedPhaseCount,
  completedAt,
}
```

Mastery không chỉ là sao: attempts, support, guided completion, accuracy, error codes, phase completion và replay outcome đều được giữ trong catalog progress. `xp` vẫn tồn tại để tương thích save cũ nhưng không dùng để unlock catalog.

## Boss Chapter 1

Boss lấy phase từ `boss.reviewLevelIds` của catalog, chọn đều các mechanic đại diện theo `phaseCount`; không còn chuỗi phase hard-code. `g1-l010` hiện dùng `collect → path → simulation → observation`. Mỗi phase cập nhật checkpoint; lỗi chỉ làm giảm recovery meter cục bộ, không reset toàn boss. Grand Boss dùng 6 phase.

Khi level bị khóa, reviewer có thể dùng `Thử bản review` để kiểm tra mechanic và boss mà không ghi progress, checkpoint, unlock hoặc reward. Đây là đường QA rõ ràng, không phải bypass campaign.

## Progress và reward

Progress local-only dùng key `lumora.catalog.progress.v1`. `rewardLedger` đảm bảo first-clear Knowledge Energy/Shards chỉ ghi một lần. Replay vẫn có thể nâng `bestMastery`/`bestAccuracy` nhưng không farm reward.

## Verification

- `src/runtime/levelRuntime.test.js`: catalog resolution, unknown mechanic, unlock/prerequisite, normalized result, supports/mastery, replay idempotency, chapter boundary, boss checkpoints và local Oracle.
- Full suite: `339/339` pass.
- `npm run build`: pass qua review build (`audit:curriculum` + `vite build`).
- `npm run build:production`: vẫn fail-closed khi chưa có human official approval; không dùng review build để biến prototype thành production curriculum.
- Browser QA: localhost HTTP 200, không có Vite overlay/console error; đã chơi hết 4 phase `g1-l010` và kiểm tra Grand Boss 6 phase ở chế độ review.

## Giới hạn có chủ ý

Campaign thật vẫn mở tuần tự theo prerequisite và curriculum approval chưa được tự động nâng. `Thử bản review` mở rộng QA cho cả catalog nhưng không tạo completion record. Firebase/Gemini không được thêm; Oracle local fallback là đường chạy mặc định.
