# Prototype numeral recognition

## C31 - Gọi Tên Số trong Playtest Lab

`prototype-numeral` bổ sung một model riêng cho mục tiêu nhận biết chữ số qua số lượng. Đây là khoảng trống mà audit cấu trúc đã chỉ ra: `collect` chỉ đếm hạt sáng và `match` ghép số với nhóm, nhưng chưa có lượt nhận biết số độc lập.

Model bounded gồm ba round: nhóm 3, 5 và 7 hạt; mỗi round có ba lựa chọn số. Chọn sai tạo `wrong-numeral` soft-fail, giữ nguyên nhóm để đếm lại; chọn đúng mới chuyển lượt. Pointer drag là primary, select-then-tap và native button/keyboard là fallback.

`NumeralRecognitionBoard` chỉ được render từ `prototypeNodes` trong Playtest Lab. Prototype không được thêm vào 12 Main Quest nodes, campaign progress, mastery, reward, XP, persistence, cloud hoặc production audit.

## Nubi visual boundary

Nubi tiếp tục dùng sprite RGBA trong suốt và các lớp corona/cutout edge bounded. Opacity mask đã được hạ để silhouette nổi trên scene mà không tạo cảm giác nhân vật có một background hình chữ nhật hoặc một bản sao full-body quá mạnh.

## Review boundary

Settings → Parent → answer `12 × 8 = 96` → Playtest Lab → `Gọi Tên Số`.

Preview có thao tác thật nhưng không ghi tiến trình hay approval. Production audit tiếp tục fail-closed cho tới khi có official curriculum evidence và human approval.

## Verification

- `src/numeralRecognitionEngine.test.js`: state bounded, soft-fail, completion và malformed input.
- `src/numeralVisual.test.js`: BoardRouter, registry, interaction contract, drop zone và reduced-motion CSS.
- `npm test`.
- `npm run build:demo`.
- Browser QA: wrong numeral, Pointer drag, select-then-tap, completion và transparent Nubi surface.
