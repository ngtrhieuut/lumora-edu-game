import { getLevelById } from "../levelCatalog/index.js";

// Runtime content is intentionally separate from the curriculum catalog.
// Catalog rows describe learning intent; this layer supplies deterministic,
// bounded playable objects for every mechanic family without putting React in
// the data. Explicit review content can override the generated prototype.

const G1_CONTENT = Object.freeze({
  "g1-l001": Object.freeze({
    target: 5,
    items: Object.freeze([
      { id: "seed-1", symbol: "✦", correct: true }, { id: "seed-2", symbol: "✧", correct: false },
      { id: "seed-3", symbol: "✦", correct: true }, { id: "seed-4", symbol: "✦", correct: true },
      { id: "seed-5", symbol: "◇", correct: false }, { id: "seed-6", symbol: "✦", correct: true },
      { id: "seed-7", symbol: "✦", correct: true },
    ]),
    hintLadder: ["Tìm những hạt có ánh sáng bên trong.", "Có năm hạt đang phát sáng.", "Hãy bắt đầu với hạt có ký hiệu ✦."],
  }),
  "g1-l002": Object.freeze({
    slots: Object.freeze([{ id: "before", label: "Trước 3", expected: 2 }, { id: "after", label: "Sau 3", expected: 4 }]),
    choices: Object.freeze([2, 4, 1, 5]),
    hintLadder: ["Nhìn số ở giữa là 3.", "Đếm lùi một bước cho ô trước, tiến một bước cho ô sau.", "Ô trước cần 2; ô sau cần 4."],
  }),
  "g1-l003": Object.freeze({
    items: Object.freeze([
      { id: "left", label: "Cụm A", count: 3, bucket: "less" },
      { id: "right", label: "Cụm B", count: 5, bucket: "more" },
    ]),
    buckets: Object.freeze([{ id: "more", label: "Nhiều hơn" }, { id: "less", label: "Ít hơn" }]),
    hintLadder: ["Nhìn số đom đóm trong từng cụm.", "Cụm có năm vật sáng nhiều hơn cụm có ba vật.", "Đưa Cụm B vào cổng Nhiều hơn."],
  }),
  "g1-l004": Object.freeze({
    sequence: Object.freeze([1, 2, 3, 4]),
    choices: Object.freeze([3, 1, 4, 2]),
    hintLadder: ["Bậc thang bắt đầu từ số nhỏ.", "Sau 1 là số 2.", "Chọn số đang được gọi sáng trên bậc kế tiếp."],
  }),
  "g1-l005": Object.freeze({
    target: 5,
    choices: Object.freeze(["firefly-1", "firefly-2", "firefly-3", "firefly-4", "firefly-5", "extra"]),
    hintLadder: ["Tổ cần đủ năm đom đóm.", "Đếm số ô sáng còn trống.", "Kéo từng đom đóm vào tổ cho đến khi đủ năm."],
  }),
  "g1-l006": Object.freeze({
    total: 6,
    splits: Object.freeze([{ id: "2-4", left: 2, right: 4 }, { id: "3-3", left: 3, right: 3 }, { id: "1-4", left: 1, right: 4 }]),
    correct: "2-4",
    hintLadder: ["Hai nhánh vẫn phải giữ đủ sáu hạt.", "Đếm cả hai phía rồi cộng lại.", "Hai và bốn vẫn giữ nguyên sáu."],
  }),
  "g1-l007": Object.freeze({
    pairs: Object.freeze([
      { id: "merge-2-3", left: 2, right: 3, total: 5 },
      { id: "merge-1-4", left: 1, right: 4, total: 5 },
      { id: "merge-3-2", left: 3, right: 2, total: 5 },
    ]),
    hintLadder: ["Mỗi dòng có hai nhóm sáng.", "Gộp các nhóm lại rồi quan sát tổng.", "Tìm các dòng cùng tạo ra năm hạt."],
  }),
  "g1-l008": Object.freeze({
    start: 5,
    choices: Object.freeze([1, 2, 3]),
    correct: 2,
    hintLadder: ["Máy cần bớt vật bị nhiễu.", "Sau khi bớt, cây còn ba hạt.", "Từ năm bớt hai còn ba."],
  }),
  "g1-l009": Object.freeze({
    scenes: Object.freeze([
      { id: "ready", label: "Bàn đủ đồ", seats: 3, cups: 3, fruit: 3, correct: true },
      { id: "few-cups", label: "Bàn thiếu ly", seats: 3, cups: 2, fruit: 3, correct: false },
      { id: "few-fruit", label: "Bàn thiếu quả", seats: 3, cups: 3, fruit: 2, correct: false },
    ]),
    hintLadder: ["Mỗi bạn cần một ghế, một ly và một quả.", "Đếm từng nhóm trên bàn.", "Chọn bàn có ba ghế, ba ly và ba quả."],
  }),
});

const MECHANIC_GUIDES = Object.freeze({
  collect: Object.freeze({
    titleVi: "Tìm đúng vật thể",
    steps: Object.freeze(["Đếm mục tiêu ở giữa.", "Chạm từng vật đang sáng.", "Dừng khi bộ đếm đủ." ]),
    ruleVi: "Chỉ vật đang phát sáng mới được tính.",
  }),
  "slot-fill": Object.freeze({
    titleVi: "Chọn mảnh rồi đặt vào ô",
    steps: Object.freeze(["Nhìn số hoặc dấu hiệu trên cầu.", "Chạm một mảnh ở hàng dưới.", "Chạm ô còn thiếu để đặt mảnh." ]),
    ruleVi: "Mỗi ô chỉ nhận mảnh đúng với vị trí của nó.",
  }),
  sort: Object.freeze({
    titleVi: "So sánh rồi phân loại",
    steps: Object.freeze(["Chạm một nhóm vật.", "Đếm hoặc quan sát thuộc tính của nhóm.", "Chạm bờ phù hợp để đặt nhóm." ]),
    ruleVi: "Đặt từng nhóm vào đúng bờ; đặt sai không làm mất màn chơi.",
  }),
  path: Object.freeze({
    titleVi: "Nối đường theo quy luật",
    steps: Object.freeze(["Nhìn bậc đang nhấp nháy.", "Tìm bước kế tiếp trong dãy.", "Chạm số đúng để nối đường." ]),
    ruleVi: "Đi theo thứ tự; nếu nhầm, bậc hiện tại vẫn còn để thử lại.",
  }),
  "build-repair": Object.freeze({
    titleVi: "Chọn mảnh để sửa cấu trúc",
    steps: Object.freeze(["Đếm số ô còn trống.", "Chạm một mảnh sáng.", "Chạm ô đang được gọi để lắp vào." ]),
    ruleVi: "Mảnh thừa chỉ là vật gây nhiễu, không làm hỏng công trình.",
  }),
  simulation: Object.freeze({
    titleVi: "Thử một cách chia",
    steps: Object.freeze(["Nhìn tổng số vật trong Lõi.", "So sánh hai nhánh của từng cách chia.", "Chọn cách vẫn giữ nguyên tổng." ]),
    ruleVi: "Hai phần sau khi chia vẫn phải cộng lại bằng tổng ban đầu.",
  }),
  match: Object.freeze({
    titleVi: "Gộp hai nhóm rồi kiểm tra tổng",
    steps: Object.freeze(["Nhìn hai nhóm trong một dòng.", "Đếm từng nhóm rồi gộp lại.", "Chạm dòng có tổng đang được gọi." ]),
    ruleVi: "Một dòng đúng khi tổng của hai nhóm khớp mục tiêu.",
  }),
  sequence: Object.freeze({
    titleVi: "Tìm bước còn thiếu",
    steps: Object.freeze(["Quan sát những bước đã sáng.", "Nói hoặc đếm quy luật tiếp theo.", "Chạm lựa chọn làm mạch hoàn chỉnh." ]),
    ruleVi: "Không cần nhanh; chỉ cần giữ đúng nhịp của dãy.",
  }),
  observation: Object.freeze({
    titleVi: "Quan sát bằng chứng",
    steps: Object.freeze(["Nhìn từng nhóm trong cảnh.", "So sánh các dấu hiệu cần thiết.", "Chạm cảnh có đủ bằng chứng." ]),
    ruleVi: "Hãy chọn theo điều con nhìn thấy, không chọn theo đoán mò.",
  }),
  "resource-balance": Object.freeze({
    titleVi: "Giữ các nguồn cân bằng",
    steps: Object.freeze(["Nhìn tổng nguồn đang có.", "So sánh các cách phân bổ.", "Chọn cách không làm thiếu nguồn." ]),
    ruleVi: "Một hệ thống tốt phải giữ đủ tổng và không bỏ quên nhánh nào.",
  }),
  lab: Object.freeze({
    titleVi: "Dự đoán rồi kiểm tra",
    steps: Object.freeze(["Quan sát tín hiệu ban đầu.", "Chọn giả thuyết phù hợp.", "Đối chiếu lựa chọn với kết quả nhìn thấy." ]),
    ruleVi: "Kết luận phải dựa trên tín hiệu trong bảng, không dựa vào tốc độ.",
  }),
  data: Object.freeze({
    titleVi: "Đọc dữ liệu để quyết định",
    steps: Object.freeze(["Nhìn chiều cao các cột hoặc dấu hiệu.", "Tìm tín hiệu nổi bật.", "Chọn quyết định có bằng chứng rõ nhất." ]),
    ruleVi: "Đọc dữ liệu trước, chọn sau.",
  }),
  boss: Object.freeze({
    titleVi: "Hồi sinh từng mạch",
    steps: Object.freeze(["Làm phase đang sáng.", "Checkpoint giữ lại phase đã hoàn tất.", "Bấm tiếp tục để chuyển sang mạch kế." ]),
    ruleVi: "Boss không reset toàn bộ khi con cần thử lại một thao tác.",
  }),
});

const DEFAULT_CONTENT = Object.freeze({
  items: Object.freeze([{ id: "a", label: "Mảnh sáng A", correct: true }, { id: "b", label: "Mảnh sáng B", correct: false }]),
  choices: Object.freeze([1, 2, 3]),
  hintLadder: ["Quan sát các vật thể trong cảnh.", "Hãy thử thao tác đang được Nubi làm sáng.", "Chọn mảnh phù hợp nhất với mục tiêu."],
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? Math.trunc(value) : min));
}

function levelSeed(level) {
  const id = String(level?.id ?? "prototype");
  return [...id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
}

function shuffle(values, seed) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = (seed + index * 17) % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function generatedContent(level) {
  const seed = levelSeed(level);
  const position = clamp(level?.chapterPosition ?? 1, 1, 10);
  const grade = clamp(level?.grade ?? 1, 1, 5);
  const base = clamp(grade + position - 1, 2, 8);
  const target = clamp(3 + ((seed + position) % 5), 3, 8);
  const sequence = Array.from({ length: 4 }, (_, index) => base + index);
  const correctTotal = clamp(4 + ((seed + grade) % 4), 4, 9);
  const left = clamp(1 + ((seed + position) % (correctTotal - 1)), 1, correctTotal - 1);
  const right = correctTotal - left;
  const distractor = clamp(correctTotal + 1, 5, 10);
  const guide = MECHANIC_GUIDES[level?.mechanicId] ?? MECHANIC_GUIDES.observation;
  const shared = {
    guideTitleVi: guide.titleVi,
    steps: guide.steps,
    ruleVi: guide.ruleVi,
    objectiveVi: level?.learningObjectiveVi ?? guide.titleVi,
    reviewStatusVi: level?.curriculum?.approved ? "Nội dung đã được duyệt" : "Nội dung prototype cần review",
  };

  switch (level?.mechanicId) {
    case "collect":
      return {
        ...shared,
        target,
        items: Array.from({ length: target + 2 }, (_, index) => ({
          id: `${level.id}-seed-${index + 1}`,
          symbol: index < target ? "✦" : index % 2 ? "✧" : "◇",
          correct: index < target,
        })),
        hintLadder: ["Đếm số vật mà mục tiêu đang gọi.", `Có ${target} vật đang phát sáng.`, "Chạm từng vật có lõi sáng."],
      };
    case "slot-fill":
      return {
        ...shared,
        centerValue: base,
        slots: [
          { id: `${level.id}-before`, label: `Trước ${base}`, expected: base - 1 },
          { id: `${level.id}-after`, label: `Sau ${base}`, expected: base + 1 },
        ],
        choices: shuffle([base - 1, base + 1, base - 2, base + 2], seed),
        hintLadder: [`Nhìn số ở giữa là ${base}.`, "Ô trước lùi một bước; ô sau tiến một bước.", `Điền ${base - 1} rồi ${base + 1}.`],
      };
    case "sort":
      return {
        ...shared,
        items: [
          { id: `${level.id}-less`, label: "Cụm ít hơn", count: Math.max(1, base - 1), bucket: "less" },
          { id: `${level.id}-more`, label: "Cụm nhiều hơn", count: base + 1, bucket: "more" },
        ],
        buckets: [{ id: "more", label: "Nhiều hơn" }, { id: "less", label: "Ít hơn" }],
        hintLadder: ["Đếm từng cụm.", "So sánh số lượng hai cụm.", "Cụm nhiều hơn vào cổng Nhiều hơn."],
      };
    case "path":
      return {
        ...shared,
        sequence,
        choices: shuffle([...sequence, base - 1], seed),
        hintLadder: ["Đường bắt đầu ở số nhỏ.", `Sau ${base} là ${base + 1} nếu đó là bậc đang gọi.`, "Chọn đúng bậc đang nhấp nháy."],
      };
    case "build-repair":
      return {
        ...shared,
        target,
        choices: [...Array.from({ length: target }, (_, index) => `firefly-${index + 1}`), "extra"],
        hintLadder: [`Cấu trúc cần đủ ${target} mảnh.`, "Đếm ô còn thiếu.", "Chọn mảnh sáng tiếp theo rồi đặt vào ô đang gọi."],
      };
    case "simulation":
    case "resource-balance":
      return {
        ...shared,
        total: correctTotal,
        splits: [
          { id: `${level.id}-correct`, label: "Giữ đủ tổng", left, right, correct: true },
          { id: `${level.id}-low`, label: "Thiếu một phần", left: Math.max(0, left - 1), right, correct: false },
          { id: `${level.id}-high`, label: "Thừa một phần", left: left + 1, right: distractor - (left + 1), correct: false },
        ],
        correct: `${level.id}-correct`,
        hintLadder: [`Tổng ban đầu là ${correctTotal}.`, "Cộng hai nhánh của từng lựa chọn.", `Chọn cách vẫn bằng ${correctTotal}.`],
      };
    case "match":
      return {
        ...shared,
        pairs: [0, 1, 2].map((index) => ({
          id: `${level.id}-pair-${index + 1}`,
          left: index + 1,
          right: correctTotal - (index + 1),
          total: correctTotal,
        })),
        hintLadder: ["Nhìn hai nhóm trong từng dòng.", "Gộp rồi đếm tổng.", `Chỉ các dòng tạo ra ${correctTotal} mới đúng.`],
      };
    case "sequence":
      return {
        ...shared,
        sequence,
        choices: shuffle([...sequence], seed),
        hintLadder: ["Nhìn nhịp tăng dần.", "Tìm bước kế tiếp.", `Sau ${sequence[2]} là ${sequence[3]}.`],
      };
    case "observation":
      return {
        ...shared,
        scenes: [
          { id: `${level.id}-ready`, label: "Cảnh đủ điều kiện", seats: 3, cups: 3, fruit: 3, correct: true },
          { id: `${level.id}-few-cups`, label: "Cảnh thiếu một nhóm", seats: 3, cups: 2, fruit: 3, correct: false },
          { id: `${level.id}-few-fruit`, label: "Cảnh còn lệch", seats: 3, cups: 3, fruit: 2, correct: false },
        ],
        hintLadder: ["Quan sát từng nhóm.", "Đếm ghế, ly và quả.", "Chọn cảnh có ba nhóm bằng nhau."],
      };
    case "lab":
      return {
        ...shared,
        options: [
          { id: `${level.id}-observe`, label: "Đọc tín hiệu rồi dự đoán", correct: true },
          { id: `${level.id}-guess`, label: "Chọn ngay không quan sát", correct: false },
        ],
        hintLadder: ["Nhìn tín hiệu trước.", "So sánh các dấu hiệu trong bảng.", "Chọn kết luận có bằng chứng."],
      };
    case "data":
      return {
        ...shared,
        options: [
          { id: `${level.id}-highest`, label: "Chọn tín hiệu cao nhất", correct: true },
          { id: `${level.id}-lowest`, label: "Chọn tín hiệu thấp nhất", correct: false },
        ],
        hintLadder: ["Nhìn chiều cao các cột.", "Tìm cột nổi bật nhất.", "Chọn tín hiệu cao nhất."],
      };
    default:
      return { ...shared, ...DEFAULT_CONTENT };
  }
}

function withGuide(level, content) {
  const guide = MECHANIC_GUIDES[level?.mechanicId] ?? MECHANIC_GUIDES.observation;
  return Object.freeze({
    ...content,
    guideTitleVi: content.guideTitleVi ?? guide.titleVi,
    steps: content.steps ?? guide.steps,
    ruleVi: content.ruleVi ?? guide.ruleVi,
    objectiveVi: content.objectiveVi ?? level?.learningObjectiveVi ?? guide.titleVi,
    levelId: level?.id ?? null,
    mechanicId: level?.mechanicId ?? null,
    levelTitleVi: level?.titleVi ?? null,
    reviewStatusVi: level?.curriculum?.approved ? "Nội dung đã được duyệt" : "Nội dung prototype cần review",
  });
}

export function getRuntimeContent(level) {
  const specific = G1_CONTENT[level?.id] ?? {};
  return withGuide(level, { ...generatedContent(level), ...specific });
}

export function getBossPhaseContent(phase, level) {
  const sourceLevel = getLevelById(phase?.sourceLevelId) ?? (phase?.sourceLevelId ? null : level);
  const phaseLevel = {
    ...(sourceLevel ?? level),
    id: phase?.sourceLevelId ?? sourceLevel?.id ?? level?.id,
    mechanicId: phase?.mechanicId ?? sourceLevel?.mechanicId ?? level?.mechanicId,
  };
  const content = getRuntimeContent(phaseLevel);
  return Object.freeze({ ...content, phaseId: phase?.id ?? null, phaseLabel: phase?.labelVi ?? "Mạch hồi sinh" });
}

export { G1_CONTENT, MECHANIC_GUIDES, generatedContent };
