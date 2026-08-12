# Prototype compare pair và Nubi presence

## C30 · Pairwise comparison trong Playtest Lab

`prototype-compare-pair` bổ sung model **so sánh từng cặp lớn hơn/nhỏ hơn** để lấp khoảng trống của outline MVP: `sort` hiện là phân loại nhiều hạt, còn `order` là sắp xếp trình tự. Prototype này chỉ hiển thị một cặp tại một thời điểm và gọi một quan hệ cụ thể.

`src/comparePairEngine.js` giữ state bounded gồm ba round, object đang chọn, answer đã nhận và mistakes. Đúng sẽ chuyển sang cặp sau; sai trả `compare-mismatch`, giữ round hiện tại và không xóa answer hợp lệ trước đó.

`ComparePairBoard` dùng Pointer drag làm primary; chọn hạt rồi chạm ô và native button/keyboard là fallback. Hai ô `larger`/`smaller` luôn là drop target để thao tác sai đi qua soft-fail có thể quan sát. Model không được thêm vào `nodes`, `orderedNodeIds`, campaign, mastery, reward, XP, persistence, cloud hoặc production audit.

## Nubi visual correction

`nubi-silhouette` và `nubi-cutout-edge` vẫn dùng mask từ sprite RGBA, nhưng opacity giảm từ glow full-body xuống cue viền nhẹ hơn. Mục tiêu là giữ cảm giác Nubi nổi khỏi scene mà không tạo một bản sao toàn thân giống background. Corona, core flare, tether và reduced-motion contract vẫn giữ nguyên.

## Review boundary

Settings → Parent area → answer `12 × 8 = 96` → Playtest Lab → `Hai Bờ Kích Thước`.

Preview có thao tác thật nhưng không ghi progress, mastery, reward, XP hay curriculum approval. Production audit tiếp tục fail-closed cho tới khi có official curriculum evidence và human approval.

## Verification

- `src/comparePairEngine.test.js`: state, soft-fail, bounded completion và malformed input.
- `src/comparePairVisual.test.js`: BoardRouter, drop-zone contract, registry và reduced-motion CSS.
- `npm test`.
- `npm run build:demo`.
- Browser QA: wrong pair, Pointer drag đúng, select-then-tap, completion cả ba round, desktop/mobile no-overflow và computed transparent Nubi surface.
