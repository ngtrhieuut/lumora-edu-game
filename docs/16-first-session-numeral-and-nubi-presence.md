# C32 - First-session numeral bridge and Nubi presence

## Mục tiêu

Đưa khoảng trống `Khởi động — nhận biết số` vào đúng vị trí trải nghiệm đầu tiên mà không tự biến prototype thành curriculum production:

`Oracle → Gọi Tên Số → Bãi Hạt Sáng (collect)`

`prototype-numeral` vẫn là local-only, `approved: false`, `reward: 0`; hoàn tất chỉ chuyển UI sang node `collect`, không gọi `completeLevel`, không ghi progress, mastery, XP, reward, persistence, cloud hoặc approval.

## Nubi presence contract

`NubiFigure` có wrapper `.nubi-character` để sprite RGBA luôn là lớp đọc đầu tiên. Các mask full-body (`nubi-silhouette`, `nubi-cutout-edge`) được hạ opacity; ambient field chỉ còn một tín hiệu nền rất nhẹ và contact shadow. Core, corona và beam dành cho responding/resonant hoặc lúc kéo token, nên phản hồi gắn với sự kiện thay vì một halo thường trực.

Không đổi PNG, không flatten asset và không tạo background rectangle. `prefers-reduced-motion` vẫn giữ state/signal tĩnh nhưng tắt animation.

## Verification

- `src/firstSessionFlow.js`, `src/firstSessionPrototype.js`: gate và transition fail-closed.
- `src/nubiVisual.test.js`: transparent character layer, ambient suppression, drag signal và reduced motion.
- `npm test`: 325/325.
- `npm run build:demo`: pass; prototype audit vẫn `12 nodes, 3 optional quests, 0 approved`.
- `npm run audit:curriculum:release`: vẫn BLOCKED với `0 approved`, vì chưa có official curriculum evidence và human approval.
- Browser localhost: `Gọi Tên Số` đã kiểm tra tap fallback và Pointer drag thật; drag đúng chuyển round và computed style xác nhận core/corona bật theo event.

## Review path

Settings → Parent → `12 × 8 = 96` → Playtest Lab → `Gọi Tên Số`.

First-session path chỉ xuất hiện sau onboarding mới; Parent/Playtest preview vẫn là đường duyệt nhanh, không làm thay đổi báo cáo phụ huynh.
