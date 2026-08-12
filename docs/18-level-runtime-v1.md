# LevelRuntime v1

## Mục tiêu

`LevelRuntime v1` là runtime data-driven cho catalog 500 level. Catalog giữ learning intent và prerequisite; runtime chọn mechanic family, renderer và pure state engine. Level id không được dùng làm nhánh React.

Luồng reviewable đầu tiên được nối trong App:

`catalog-map → g1-l001..g1-l010 → normalized learning evidence → Knowledge Energy/Shards → restoration/reward → catalog-map`

Chapter 2 (`g1-l011`) chỉ là boundary tiếp theo. Nội dung curriculum vẫn là prototype mapping và không tự động được approve.

## Các lớp

- `src/runtime/levelRuntimeEngine.js`: state machine thuần cho attempts, actions, supports, guided state, error codes, accuracy, mastery, phase checkpoint và normalized result.
- `src/runtime/levelRuntimeAdapter.js`: resolve một catalog level thành renderer family, content, boss phase sequence và review references.
- `src/runtime/levelRuntimeRegistry.js`: registry renderer theo `mechanicId`; unknown mechanic trả fallback fail-closed.
- `src/runtime/levelRuntimeContent.js`: bounded content cho Grade 1 Chapter 1, tách khỏi catalog và React.
- `src/runtime/levelRuntimeRenderers.jsx`: các renderer family touch-first: collect, slot-fill, sort, path, build-repair, simulation, match, sequence, observation, data/lab và boss.
- `src/runtime/LevelRuntime.jsx`: shell generic quản lý session state, Oracle local, support ladder, duration, completion và checkpoint callback.
- `src/runtime/catalogProgression.js`: progress schema v1, prerequisite unlock, Grade → Chapter → Level progress, first-clear reward ledger và replay evidence.
- `src/runtime/CatalogCampaignView.jsx`: map Chapter 1 và restoration/reward handoff để reviewer trải nghiệm mà không mở rộng legacy 12-node shell.

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

`g1-l010` có bốn phase theo family: `collect → sequence → match → observation`. Mỗi phase cập nhật checkpoint; lỗi chỉ làm giảm recovery meter cục bộ, không reset toàn boss. Oracle gợi ý theo ladder ba bước và không nói “sai” hay tự lộ đáp án ngay.

## Progress và reward

Progress local-only dùng key `lumora.catalog.progress.v1`. `rewardLedger` đảm bảo first-clear Knowledge Energy/Shards chỉ ghi một lần. Replay vẫn có thể nâng `bestMastery`/`bestAccuracy` nhưng không farm reward.

## Verification

- `src/runtime/levelRuntime.test.js`: catalog resolution, unknown mechanic, unlock/prerequisite, normalized result, supports/mastery, replay idempotency, chapter boundary, boss checkpoints và local Oracle.
- Full suite: `339/339` pass.
- `npm run build:demo`: pass; curriculum prototype audit vẫn fail-closed ở production vì catalog/content chưa có human official approval.

## Giới hạn có chủ ý

App chỉ cho phép reviewer chơi Grade 1 Chapter 1 (`g1-l001`…`g1-l010`). Các catalog row còn lại có schema và adapter boundary, nhưng chưa được mở trong campaign UI. Firebase/Gemini không được thêm; Oracle local fallback là đường chạy mặc định.
