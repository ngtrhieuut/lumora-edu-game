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
