# Lumora Design Source Manifest

Nguồn hình concept hiện tại được tạo từ các prompt thiết kế Lumora và lưu trong Google Drive folder:

`https://drive.google.com/drive/folders/1T_RdGdhpkJTOjohBky63OeyIx9Pu84Ic`

> Lưu ý kỹ thuật: GitHub Connector hiện tại chỉ hỗ trợ tạo/sửa file UTF-8 và không có tham số upload binary file. Vì vậy repo tạm thời lưu **manifest + review + mapping**; các JPG gốc vẫn ở Drive. Khi có đường upload binary/Git LFS hoặc push từ local, giữ đúng cấu trúc path bên dưới.

## Canonical mapping

| # | File Drive | Hạng mục | GitHub path dự kiến | Trạng thái review |
|---|---|---|---|---|
| 01 | 1.jpg | UI visual direction / gameplay mood | `design/00-visual-direction/01-ui-direction.jpg` | Revise |
| 02 | 2.jpg | World visual style board | `design/01-world/02-world-style-board.jpg` | Keep |
| 03 | 3.jpg | World map | `design/01-world/03-world-map.jpg` | Keep |
| 04 | 4.jpg | Before/after restoration | `design/01-world/04-restoration-language.jpg` | **Canonical** |
| 05 | 5.jpg | Linh Thú silhouette exploration | `design/02-characters/05-silhouettes.jpg` | Explore |
| 06 | 6.jpg | 3 starter Linh Thú | `design/02-characters/06-starters.jpg` | Revise |
| 07 | 7.jpg | Evolution 5 stages | `design/02-characters/07-evolution-line.jpg` | Revise/Keep direction |
| 08 | 8.jpg | Oracle character poses | `design/02-characters/08-oracle.jpg` | Revise |
| 09 | 9.jpg | First 15-minute storyboard | `design/03-player-flow/09-first-15-minutes.jpg` | **Canonical flow** |
| 10 | 10.jpg | Home screen | `design/03-player-flow/10-home.jpg` | Revise |
| 11 | 11.jpg | Adventure map | `design/03-player-flow/11-adventure-map.jpg` | Keep |
| 12 | 12.jpg | Collect quantity | `design/04-gameplay/12-collect-quantity.jpg` | Keep |
| 13 | 13.jpg | Cầu Ánh Sáng | `design/04-gameplay/13-light-bridge.jpg` | Keep/Refine |
| 14 | 14.jpg | Đường Đi Rune | `design/04-gameplay/14-rune-path.jpg` | Revise |
| 15 | 15.jpg | Suối Sắp Xếp | `design/04-gameplay/15-sorting-stream.jpg` | Keep/Refine |
| 16 | 16.jpg | Xưởng Hình Khối | `design/04-gameplay/16-shape-workshop.jpg` | Revise |
| 17 | 17.jpg | Real-world scenario | `design/04-gameplay/17-real-world-scenario.jpg` | **Major revise** |
| 18 | 18.jpg | Boss Kẻ Nuốt Con Số | `design/05-boss/18-number-eater.jpg` | Keep/Refine |
| 19 | 19.jpg | Level complete | `design/06-progression/19-level-complete.jpg` | Revise |
| 20 | 20.jpg | Evolution cinematic | `design/06-progression/20-evolution-cinematic.jpg` | **Canonical** |
| 21 | 21.jpg | Knowledge City | `design/07-metagame/21-knowledge-city.jpg` | Keep/Reduce scope |
| 22 | 22.jpg | Linh Thú collection | `design/07-metagame/22-creature-collection.jpg` | Revise/Defer |
| 23 | 23.jpg | League | `design/07-metagame/23-league.jpg` | Defer from MVP |
| 24 | 24.jpg | Oracle hint flow | `design/08-oracle/24-hint-flow.jpg` | **Canonical** |
| 25 | 25.jpg | Parent dashboard | `design/09-parent/25-dashboard.jpg` | Revise |
| 26 | 26.jpg | Mascot C01–C04 character exploration | `design/02-characters/26-mascot-c01-c04.jpg` | **Review: choose C04 direction / revise C01–C03** |
| 27 | 27.jpg | Oracle Concept Bible — Manifestation of Knowledge | `design/08-oracle/27-oracle-concept-bible.jpg` | **Keep / near-canonical direction** |

## Design source rule

- Drive giữ **source JPG gốc**.
- Repo giữ decision, mapping, UX spec và sau này asset đã được chốt.
- Không coi một concept image là production spec nếu chưa được đánh dấu `Canonical` hoặc `Keep` trong review.
- Khi asset mới thay thế asset cũ, không xóa lịch sử quyết định; cập nhật trạng thái trong manifest.
