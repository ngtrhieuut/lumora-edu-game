import { getLevelById } from "../levelCatalog/index.js";

// Runtime content is intentionally separate from the curriculum catalog.
// Catalog rows describe learning intent; this layer supplies deterministic,
// bounded playable objects for every mechanic family without putting React in
// the data. Explicit review content can override the generated prototype.

const G1_CONTENT = Object.freeze({
  "g1-l001": Object.freeze({
    target: 5,
    promptVi: "Tìm đúng 5 hạt sáng rồi đưa về Lõi.",
    helperVi: "Chỉ chạm hạt có lõi sáng; hạt ngủ vẫn ở nguyên chỗ.",
    items: Object.freeze([
      { id: "seed-1", symbol: "✦", correct: true }, { id: "seed-2", symbol: "✧", correct: false },
      { id: "seed-3", symbol: "✦", correct: true }, { id: "seed-4", symbol: "✦", correct: true },
      { id: "seed-5", symbol: "◇", correct: false }, { id: "seed-6", symbol: "✦", correct: true },
      { id: "seed-7", symbol: "✦", correct: true },
    ]),
    hintLadder: ["Tìm những hạt có ánh sáng bên trong.", "Có năm hạt đang phát sáng.", "Hãy bắt đầu với hạt có ký hiệu ✦."],
  }),
  "g1-l002": Object.freeze({
    promptVi: "Điền số ngay trước và ngay sau số 3.",
    helperVi: "Chọn một mảnh rồi chạm vào ô phù hợp.",
    slots: Object.freeze([{ id: "before", label: "Trước 3", expected: 2 }, { id: "after", label: "Sau 3", expected: 4 }]),
    choices: Object.freeze([2, 4, 1, 5]),
    hintLadder: ["Nhìn số ở giữa là 3.", "Đếm lùi một bước cho ô trước, tiến một bước cho ô sau.", "Ô trước cần 2; ô sau cần 4."],
  }),
  "g1-l003": Object.freeze({
    promptVi: "So sánh nhóm 3 hạt và nhóm 5 hạt.",
    helperVi: "Đặt từng nhóm vào cổng Ít hơn hoặc Nhiều hơn.",
    items: Object.freeze([
      { id: "left", label: "Cụm A", count: 3, bucket: "less" },
      { id: "right", label: "Cụm B", count: 5, bucket: "more" },
    ]),
    buckets: Object.freeze([{ id: "more", label: "Nhiều hơn" }, { id: "less", label: "Ít hơn" }]),
    hintLadder: ["Nhìn số đom đóm trong từng cụm.", "Cụm có năm vật sáng nhiều hơn cụm có ba vật.", "Đưa Cụm B vào cổng Nhiều hơn."],
  }),
  "g1-l004": Object.freeze({
    promptVi: "Nối các số 1, 2, 3, 4 theo thứ tự tăng dần.",
    helperVi: "Chọn số tiếp theo đang chờ sáng.",
    sequence: Object.freeze([1, 2, 3, 4]),
    choices: Object.freeze([3, 1, 4, 2]),
    hintLadder: ["Bậc thang bắt đầu từ số nhỏ.", "Sau 1 là số 2.", "Chọn số đang được gọi sáng trên bậc kế tiếp."],
  }),
  "g1-l005": Object.freeze({
    target: 5,
    promptVi: "Lắp đủ 5 đom đóm vào tổ.",
    helperVi: "Chọn một đom đóm rồi chạm vào ô đang sáng.",
    slotChoices: Object.freeze(["firefly-1", "firefly-2", "firefly-3", "firefly-4", "firefly-5"]),
    slotLabels: Object.freeze(["Mảnh 1", "Mảnh 2", "Mảnh 3", "Mảnh 4", "Mảnh 5"]),
    choices: Object.freeze(["firefly-1", "firefly-2", "firefly-3", "firefly-4", "firefly-5", "extra"]),
    hintLadder: ["Tổ cần đủ năm đom đóm.", "Đếm số ô sáng còn trống.", "Kéo từng đom đóm vào tổ cho đến khi đủ năm."],
  }),
  "g1-l006": Object.freeze({
    total: 6,
    promptVi: "Chọn cách tách 6 hạt mà hai phần vẫn cộng lại bằng 6.",
    helperVi: "Cộng hai nhánh của từng cách chia để kiểm tra.",
    splits: Object.freeze([{ id: "2-4", left: 2, right: 4 }, { id: "3-3", left: 3, right: 3 }, { id: "1-4", left: 1, right: 4 }]),
    correct: "2-4",
    hintLadder: ["Hai nhánh vẫn phải giữ đủ sáu hạt.", "Đếm cả hai phía rồi cộng lại.", "Hai và bốn vẫn giữ nguyên sáu."],
  }),
  "g1-l007": Object.freeze({
    promptVi: "Gộp hai nhóm trong từng dòng rồi kiểm tra tổng.",
    helperVi: "Các dòng đều phải tạo ra 5 hạt sáng.",
    pairs: Object.freeze([
      { id: "merge-2-3", left: 2, right: 3, total: 5 },
      { id: "merge-1-4", left: 1, right: 4, total: 5 },
      { id: "merge-3-2", left: 3, right: 2, total: 5 },
    ]),
    hintLadder: ["Mỗi dòng có hai nhóm sáng.", "Gộp các nhóm lại rồi quan sát tổng.", "Tìm các dòng cùng tạo ra năm hạt."],
  }),
  "g1-l008": Object.freeze({
    start: 5,
    variant: "subtract",
    target: 3,
    promptVi: "Có 5 hạt. Cần bớt bao nhiêu để còn 3 hạt?",
    helperVi: "Chọn số hạt cần lấy ra, rồi kiểm tra phép tính.",
    ruleVi: "Số ban đầu trừ số lấy ra phải bằng số còn lại.",
    choices: Object.freeze([1, 2, 3]),
    correct: 2,
    guideTitleVi: "Bớt hạt để còn đúng số",
    steps: Object.freeze(["Đếm số hạt ban đầu.", "Nhìn số hạt cần còn lại.", "Chọn số hạt cần lấy ra."]),
    hintLadder: ["Bắt đầu với 5 hạt.", "Mục tiêu là còn 3 hạt.", "5 - 2 = 3 nên cần bớt 2 hạt."],
  }),
  "g1-l009": Object.freeze({
    promptVi: "Chọn bàn có đủ một ghế, một ly và một quả cho mỗi bạn.",
    helperVi: "Đếm từng nhóm đồ dùng trước khi chọn.",
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

// Grade 1 keeps the mechanic families reusable, but each chapter still needs
// stimuli that belong to its learning domain. These profiles replace the old
// number-only placeholders and make the board explain what is being learned.
const G1_CHAPTER_PROFILES = Object.freeze({
  1: Object.freeze({ domainVi: "Số lượng và thứ tự", mode: "number", noun: "hạt sáng", symbol: "✦", values: Object.freeze([1, 2, 3, 4]), sequenceRuleVi: "Mỗi bước tăng thêm một." }),
  2: Object.freeze({ domainVi: "Gộp, thêm và bớt", mode: "number", noun: "hạt sáng", symbol: "✦", values: Object.freeze([2, 3, 4, 5]), sequenceRuleVi: "Khi thêm, số tăng; khi bớt, số giảm." }),
  3: Object.freeze({ domainVi: "Hình dạng và vị trí", mode: "shape", noun: "hình", symbols: Object.freeze(["●", "▲", "■", "▭"]), values: Object.freeze(["hình tròn", "hình tam giác", "hình vuông", "hình chữ nhật"]), sequenceRuleVi: "Dãy gọi tên hình theo thứ tự: tròn → tam giác → vuông → chữ nhật." }),
  4: Object.freeze({ domainVi: "Đo lường, thời gian và tiền", mode: "measure", noun: "vật cần đo", symbols: Object.freeze(["—", "━━", "━━━━", "━━━━━━"]), values: Object.freeze(["ngắn", "vừa", "dài", "dài nhất"]), sequenceRuleVi: "Dãy đi từ ngắn đến dài: ngắn → vừa → dài → dài nhất." }),
  5: Object.freeze({ domainVi: "Cơ thể và sức khỏe", mode: "body", noun: "bộ phận cơ thể", symbols: Object.freeze(["◉", "◌", "⌁", "✋"]), values: Object.freeze(["mắt", "tai", "mũi", "tay"]), sequenceRuleVi: "Dãy lần lượt gọi tên các bộ phận đang học: mắt → tai → mũi → tay." }),
  6: Object.freeze({ domainVi: "Cây và môi trường sống", mode: "plant", noun: "giai đoạn của cây", symbols: Object.freeze(["•", "✦", "🌱", "🌿"]), values: Object.freeze(["hạt", "mầm", "cây non", "cây trưởng thành"]), sequenceRuleVi: "Cây lớn lên theo thứ tự: hạt → mầm → cây non → cây trưởng thành." }),
  7: Object.freeze({ domainVi: "Động vật và nơi sống", mode: "animal", noun: "giai đoạn của con vật", symbols: Object.freeze(["🥚", "🐣", "🐾", "🐦"]), values: Object.freeze(["trứng", "con non", "con đang lớn", "con trưởng thành"]), sequenceRuleVi: "Con vật lớn lên theo thứ tự: trứng → con non → con đang lớn → con trưởng thành." }),
  8: Object.freeze({ domainVi: "Bầu trời và thời tiết", mode: "weather", noun: "dấu hiệu thời tiết", symbols: Object.freeze(["☀", "☁", "☂", "☾"]), values: Object.freeze(["trời nắng", "có mây", "trời mưa", "ban đêm"]), sequenceRuleVi: "Dãy minh họa một lần đổi thời tiết: nắng → có mây → mưa → ban đêm." }),
  9: Object.freeze({ domainVi: "Kết hợp kiến thức trong đời sống", mode: "integrated", noun: "đồ vật và dấu hiệu", symbols: Object.freeze(["✦", "●", "▲", "☀"]), values: Object.freeze(["quan sát", "đếm", "so sánh", "chọn"]), sequenceRuleVi: "Làm từng bước: quan sát → đếm → so sánh → chọn." }),
  10: Object.freeze({ domainVi: "Nhiệm vụ tổng hợp trước Grand Boss", mode: "integrated", noun: "mảnh tri thức", symbols: Object.freeze(["✦", "●", "▲", "☀"]), values: Object.freeze(["quan sát", "đếm", "kiểm tra", "giải thích"]), sequenceRuleVi: "Làm từng bước: quan sát → đếm → kiểm tra → giải thích." }),
});

function getGrade1Profile(level) {
  return G1_CHAPTER_PROFILES[level?.chapter] ?? G1_CHAPTER_PROFILES[1];
}

function grade1Symbol(profile, index) {
  return profile.symbols?.[index % profile.symbols.length] ?? profile.symbol ?? "✦";
}

function grade1Sequence(level, profile, position) {
  if (profile.mode === "number") {
    const start = level.chapter === 2 ? 2 + (position % 3) : 1 + (position % 3);
    return Array.from({ length: 4 }, (_, index) => start + index);
  }
  return [...profile.values];
}

function objectiveHas(objective, pattern) {
  return pattern.test(String(objective ?? ""));
}

function buildRepairContent(level, common, profile, labels, promptVi, structureLabelVi, helperVi = "Chọn mảnh có nhãn đúng với ô đang sáng.") {
  const slotChoices = labels.map((_, index) => `${level.id}-piece-${index + 1}`);
  return {
    ...common,
    target: labels.length,
    promptVi,
    helperVi,
    slotChoices,
    slotLabels: labels,
    structureLabelVi,
    choices: [...labels.map((label, index) => ({ id: slotChoices[index], label, symbol: grade1Symbol(profile, index) })), { id: `${level.id}-extra`, label: "Mảnh thừa", symbol: "◇", extra: true }],
    hintLadder: [`Công trình cần ${labels.length} mảnh.`, "Đọc nhãn của ô đang sáng.", "Chọn đúng mảnh rồi đặt vào ô đó."],
  };
}

function grade1GeneratedContent(level, seed, shared) {
  const profile = getGrade1Profile(level);
  const position = clamp(level?.chapterPosition ?? 1, 1, 10);
  const objective = String(level?.learningObjectiveVi ?? "");
  const sequence = grade1Sequence(level, profile, position);
  const target = profile.mode === "number" ? 3 + (position % 3) : 2 + (position % 2);
  const targetCount = Math.max(2, Math.min(target, 5));
  const common = { ...shared, contentDomainVi: profile.domainVi, countLabelVi: profile.noun, itemsLabelVi: `Các lựa chọn về ${profile.noun}`, promptVi: objective };

  switch (level?.mechanicId) {
    case "collect": {
      let labels = profile.values;
      let promptVi = `Tìm đúng ${targetCount} ${profile.noun} theo yêu cầu của chặng này.`;
      if (objectiveHas(objective, /vị trí trong|ngoài|trước|sau/i)) {
        labels = ["ở trong", "ở ngoài", "ở trước", "ở sau"];
        promptVi = `Chọn ${targetCount} vật đúng vị trí mà chặng đang gọi.`;
      } else if (objectiveHas(objective, /nghỉ ngơi và vận động/i)) {
        labels = ["ngủ đủ", "vận động", "nghỉ giữa giờ", "uống nước"];
        promptVi = "Chọn các thói quen giúp cơ thể cân bằng nghỉ ngơi và vận động.";
      } else if (objectiveHas(objective, /tưới|chăm cây/i)) {
        labels = ["tưới vừa đủ", "đất ẩm", "đủ ánh sáng", "không bẻ cành"];
        promptVi = "Chọn các việc giúp cây được chăm sóc đúng cách.";
      } else if (objectiveHas(objective, /di chuyển/i)) {
        labels = ["đi bộ", "bay", "bơi", "bò"];
        promptVi = "Chọn các cách di chuyển phù hợp với con vật đang học.";
      } else if (objectiveHas(objective, /trời nắng/i)) {
        labels = ["mặt trời", "bóng râm", "đội mũ", "uống nước"];
        promptVi = "Chọn các dấu hiệu hoặc việc làm phù hợp khi trời nắng.";
      } else if (objectiveHas(objective, /nhận diện hình/i)) {
        labels = ["hình tròn trên cái đĩa", "hình vuông trên ô cửa", "hình tam giác trên biển báo", "hình chữ nhật trên quyển sách"];
        promptVi = "Tìm các hình quen thuộc xuất hiện trong đồ vật thật.";
      } else if (objectiveHas(objective, /kết hợp cộng\/trừ/i)) {
        labels = ["nhóm ban đầu", "phần thêm", "phần bớt", "số còn lại"];
        promptVi = "Chọn các mảnh thể hiện một tình huống cộng hoặc trừ.";
      }
      return {
        ...common,
        target: targetCount,
        promptVi,
        helperVi: "Quan sát nhãn và dấu hiệu; lựa chọn chưa phù hợp vẫn ở nguyên chỗ.",
        items: Array.from({ length: targetCount + 2 }, (_, index) => ({ id: `${level.id}-item-${index + 1}`, symbol: grade1Symbol(profile, index), label: labels[index % labels.length], correct: index < targetCount })),
        hintLadder: [`Đọc mục tiêu: ${level.learningObjectiveVi}.`, `Đếm đủ ${targetCount} ${profile.noun}.`, `Chạm các vật có ký hiệu ${grade1Symbol(profile, 0)} hoặc đúng mô tả.`],
      };
    }
    case "slot-fill": {
      if (/cộng/i.test(objective)) {
        const addend = 2 + (position % 2);
        const total = addend + 2;
        return {
          ...common,
          guideTitleVi: "Tìm phần còn thiếu của phép cộng",
          steps: ["Đọc số đã có.", "Đọc tổng cần tạo.", "Chọn phần còn thiếu."],
          ruleVi: "Phần đã có cộng phần còn thiếu phải bằng tổng.",
          centerLabel: `${addend} + ? = ${total}`,
          promptVi: `Tìm số cần thêm để ${addend} gộp thêm thành ${total}.`,
          slots: [{ id: `${level.id}-missing`, label: "Số cần thêm", expected: 2 }],
          choices: shuffle([2, 1, 3, 4], seed),
          hintLadder: [`Đã có ${addend} và cần được ${total}.`, "Đếm phần còn thiếu.", "Chọn số làm phép tính đúng."],
        };
      }
      if (objectiveHas(objective, /an toàn\/nguy hiểm/i)) {
        return {
          ...common,
          guideTitleVi: "Chọn hành vi an toàn",
          steps: ["Nhìn tình huống.", "Tìm việc làm bảo vệ cơ thể.", "Đặt vào ô hành vi an toàn."],
          ruleVi: "Chỉ chọn hành vi không gây nguy hiểm.",
          centerLabel: "Tình huống trước mặt",
          promptVi: "Chọn hành vi an toàn khi gặp tình huống này.",
          slots: [{ id: `${level.id}-safe`, label: "Hành vi an toàn", expected: "dừng lại" }],
          choices: shuffle(["dừng lại", "chạy tiếp", "chạm vào vật lạ"], seed),
          hintLadder: ["Dừng lại và quan sát.", "Không chạm vào vật nguy hiểm.", "Chọn hành vi: dừng lại."],
        };
      }
      if (objectiveHas(objective, /trời mưa/i)) {
        return {
          ...common,
          guideTitleVi: "Chọn đồ dùng khi trời mưa",
          steps: ["Nhìn dấu hiệu thời tiết.", "Nghĩ đến đồ dùng che mưa.", "Đặt đồ dùng phù hợp vào ô."],
          ruleVi: "Đồ dùng đúng phải giúp cơ thể tránh bị ướt.",
          centerLabel: "Trời mưa",
          promptVi: "Chọn đồ dùng phù hợp khi trời mưa.",
          slots: [{ id: `${level.id}-rain`, label: "Đồ dùng phù hợp", expected: "ô" }],
          choices: shuffle(["ô", "kính râm", "quạt"], seed),
          hintLadder: ["Nhìn dấu hiệu thời tiết.", "Trời mưa cần che người.", "Chọn chiếc ô."],
        };
      }
      if (objectiveHas(objective, /tiền Việt Nam/i)) {
        return {
          ...common,
          guideTitleVi: "Nhận biết số tiền cần trả",
          steps: ["Đọc giá món đồ.", "So sánh các số tiền.", "Đặt đúng số tiền vào ô."],
          ruleVi: "Số tiền chọn phải đúng bằng giá món đồ.",
          centerLabel: "Món đồ 5 nghìn đồng",
          promptVi: "Chọn đúng số tiền cần trả cho món đồ.",
          slots: [{ id: `${level.id}-money`, label: "Số tiền cần trả", expected: "5 nghìn đồng" }],
          choices: shuffle(["5 nghìn đồng", "2 nghìn đồng", "10 nghìn đồng"], seed),
          hintLadder: ["Đọc giá của món đồ.", "Tìm đúng số 5 nghìn.", "Chọn 5 nghìn đồng."],
        };
      }
      if (objectiveHas(objective, /ích lợi.*cây/i)) {
        return {
          ...common,
          guideTitleVi: "Nhận biết ích lợi của cây",
          steps: ["Quan sát cây xanh.", "Nghĩ đến ích lợi quen thuộc.", "Đặt ích lợi đúng vào ô."],
          ruleVi: "Ích lợi phải là điều cây thật sự có thể mang lại.",
          centerLabel: "Một cây xanh",
          promptVi: "Chọn một ích lợi quen thuộc của cây.",
          slots: [{ id: `${level.id}-benefit`, label: "Ích lợi", expected: "cho bóng mát" }],
          choices: shuffle(["cho bóng mát", "làm bẩn không khí", "làm mất nước"], seed),
          hintLadder: ["Nhìn cây trong đời sống.", "Cây có thể giúp con người như thế nào?", "Chọn: cho bóng mát."],
        };
      }
      if (objectiveHas(objective, /tai dùng để nghe/i)) {
        return {
          ...common,
          guideTitleVi: "Ghép tai với chức năng",
          steps: ["Gọi tên bộ phận.", "Nghĩ xem bộ phận làm gì.", "Đặt chức năng đúng vào ô."],
          ruleVi: "Tai dùng để nghe âm thanh.",
          centerLabel: "Bộ phận: tai",
          promptVi: "Chọn chức năng đúng của tai.",
          slots: [{ id: `${level.id}-sense`, label: "Chức năng", expected: "nghe" }],
          choices: shuffle(["nghe", "nhìn", "ngửi"], seed),
          hintLadder: ["Gọi tên bộ phận.", "Tai nhận biết âm thanh.", "Chọn: nghe."],
        };
      }
      if (objectiveHas(objective, /độ dài\/khối lượng/i)) {
        return {
          ...common,
          guideTitleVi: "So sánh hai dấu hiệu",
          steps: ["Quan sát độ dài.", "Quan sát trọng lượng.", "Đặt kết luận đủ hai phần."],
          ruleVi: "Kết luận phải khớp cả độ dài và khối lượng.",
          centerLabel: "Hai vật cần so sánh",
          promptVi: "Chọn mô tả đúng sau khi so sánh hai vật.",
          slots: [{ id: `${level.id}-compare`, label: "Kết luận", expected: "dài hơn và nhẹ hơn" }],
          choices: shuffle(["dài hơn và nhẹ hơn", "ngắn hơn và nặng hơn", "không thể so sánh"], seed),
          hintLadder: ["Nhìn độ dài trước.", "Sau đó quan sát vật nặng hay nhẹ.", "Chọn kết luận đủ cả hai dấu hiệu."],
        };
      }
      if (objectiveHas(objective, /hình học \+ vị trí/i)) {
        return {
          ...common,
          guideTitleVi: "Ghép hình với vị trí",
          steps: ["Gọi tên hình.", "Xác định vị trí.", "Đặt mô tả đủ hai phần."],
          ruleVi: "Mô tả đúng phải nói cả hình dạng và vị trí.",
          centerLabel: "Hình và vị trí",
          promptVi: "Chọn mô tả kết hợp đúng hình dạng và vị trí.",
          slots: [{ id: `${level.id}-shape-place`, label: "Mô tả đúng", expected: "hình tròn ở bên trái" }],
          choices: shuffle(["hình tròn ở bên trái", "hình vuông ở bên phải", "hình tam giác ở dưới"], seed),
          hintLadder: ["Gọi tên hình.", "Xác định vị trí của hình.", "Chọn mô tả có đủ hai phần."],
        };
      }
      if (profile.mode === "shape") {
        const expected = profile.values[1];
        return {
          ...common,
          centerLabel: "Hình đang được gọi",
          promptVi: "Chọn hình đúng với vị trí đang sáng.",
          slots: [{ id: `${level.id}-shape`, label: "Hình cần đặt", expected }],
          choices: shuffle([expected, profile.values[0], profile.values[2]], seed),
          hintLadder: ["Nhìn dấu hiệu của hình.", `Hình cần đặt là ${expected}.`, `Chọn ${expected} rồi đặt vào ô sáng.`],
        };
      }
      const center = profile.mode === "number" ? 3 + (position % 3) : profile.values[1];
      const expectedBefore = profile.mode === "number" ? center - 1 : profile.values[0];
      const expectedAfter = profile.mode === "number" ? center + 1 : profile.values[2];
      return {
        ...common,
        guideTitleVi: "Điền mối liên hệ còn thiếu",
        steps: ["Nhìn dấu hiệu ở giữa.", "Nói mối liên hệ trước và sau.", "Đặt mảnh phù hợp vào ô."],
        ruleVi: "Mỗi ô chỉ nhận mảnh khớp với mối liên hệ đang học.",
        centerValue: typeof center === "number" ? center : undefined,
        centerLabel: typeof center === "number" ? undefined : String(center),
        promptVi: `Hoàn thành phần trước và sau của ${typeof center === "number" ? `số ${center}` : `chuỗi ${center}`}.`,
        slots: [{ id: `${level.id}-before`, label: "Ngay trước", expected: expectedBefore }, { id: `${level.id}-after`, label: "Ngay sau", expected: expectedAfter }],
        choices: shuffle([expectedBefore, expectedAfter, profile.mode === "number" ? center - 2 : profile.values[3]], seed),
        hintLadder: ["Nhìn điểm ở giữa.", "Đi lùi một bước cho ô trước và tiến một bước cho ô sau.", `Điền ${expectedBefore} trước rồi ${expectedAfter}.`],
      };
    }
    case "sort": {
      if (objectiveHas(objective, /phép cộng như thêm/i)) {
        return {
          ...common,
          promptVi: "Phân biệt nhóm đã có và phần được thêm vào.",
          items: [{ id: `${level.id}-start`, label: "Nhóm ban đầu: 2 hạt", symbol: profile.symbol, count: 2, bucket: "start" }, { id: `${level.id}-added`, label: "Phần thêm: 2 hạt", symbol: profile.symbol, count: 2, bucket: "added" }],
          buckets: [{ id: "start", label: "Đã có" }, { id: "added", label: "Thêm vào" }],
          hintLadder: ["Tìm nhóm đã có trước.", "Nhóm mới xuất hiện là phần thêm vào.", "Đặt từng nhóm vào đúng cổng."],
        };
      }
      if (objectiveHas(objective, /bảo vệ cơ thể/i)) {
        return {
          ...common,
          promptVi: "Phân loại việc làm an toàn và việc làm nguy hiểm cho cơ thể.",
          items: [{ id: `${level.id}-safe`, label: "Rửa tay trước khi ăn", symbol: "✓", count: 1, bucket: "safe" }, { id: `${level.id}-danger`, label: "Chạm ổ điện", symbol: "!", count: 1, bucket: "danger" }],
          buckets: [{ id: "safe", label: "An toàn" }, { id: "danger", label: "Nguy hiểm" }],
          hintLadder: ["Đọc từng việc làm.", "Việc nào bảo vệ cơ thể?", "Đặt vào cổng An toàn hoặc Nguy hiểm."],
        };
      }
      if (objectiveHas(objective, /nóng\/lạnh/i)) {
        return {
          ...common,
          promptVi: "Phân loại tình huống nóng và lạnh.",
          items: [{ id: `${level.id}-hot`, label: "Nước nóng", symbol: "♨", count: 1, bucket: "hot" }, { id: `${level.id}-cold`, label: "Kem lạnh", symbol: "❄", count: 1, bucket: "cold" }],
          buckets: [{ id: "hot", label: "Nóng" }, { id: "cold", label: "Lạnh" }],
          hintLadder: ["Nhìn dấu hiệu của từng vật.", "Nước nóng và kem lạnh khác nhau thế nào?", "Đặt từng vật vào đúng cổng."],
        };
      }
      if (objectiveHas(objective, /phân loại cây/i)) {
        return {
          ...common,
          promptVi: "Phân loại cây có hoa và cây không có hoa qua quan sát.",
          items: [{ id: `${level.id}-flower`, label: "Cây có hoa", symbol: "✿", count: 1, bucket: "flower" }, { id: `${level.id}-green`, label: "Cây không có hoa", symbol: "🌿", count: 1, bucket: "green" }],
          buckets: [{ id: "flower", label: "Có hoa" }, { id: "green", label: "Không có hoa" }],
          hintLadder: ["Nhìn bộ phận nổi bật của cây.", "Tìm cây có hoa.", "Đặt từng cây vào đúng cổng."],
        };
      }
      if (objectiveHas(objective, /phân loại động vật/i)) {
        return {
          ...common,
          promptVi: "Phân loại con vật biết bay và con vật không bay.",
          items: [{ id: `${level.id}-bird`, label: "Chim", symbol: "🐦", count: 1, bucket: "flies" }, { id: `${level.id}-fish`, label: "Cá", symbol: "🐟", count: 1, bucket: "not-flies" }],
          buckets: [{ id: "flies", label: "Biết bay" }, { id: "not-flies", label: "Không bay" }],
          hintLadder: ["Quan sát cách di chuyển.", "Chim có cánh; cá không bay.", "Đặt từng con vật vào đúng cổng."],
        };
      }
      if (objectiveHas(objective, /sắp xếp lịch hoạt động/i)) {
        return {
          ...common,
          promptVi: "Sắp xếp hoạt động vào thời điểm phù hợp trong ngày.",
          items: [{ id: `${level.id}-morning`, label: "Ăn sáng", symbol: "☀", count: 1, bucket: "morning" }, { id: `${level.id}-night`, label: "Đi ngủ", symbol: "☾", count: 1, bucket: "evening" }],
          buckets: [{ id: "morning", label: "Buổi sáng" }, { id: "evening", label: "Buổi tối" }],
          hintLadder: ["Đọc hoạt động.", "Nghĩ đến thời điểm con thường làm việc đó.", "Đặt hoạt động vào đúng buổi."],
        };
      }
      if (objectiveHas(objective, /đo lường \+ thời gian/i)) {
        return {
          ...common,
          promptVi: "Phân loại thông tin thuộc đo lường hoặc thời gian.",
          items: [{ id: `${level.id}-measure`, label: "Dài 5 gang tay", symbol: "—", count: 1, bucket: "measure" }, { id: `${level.id}-time`, label: "3 giờ", symbol: "◷", count: 1, bucket: "time" }],
          buckets: [{ id: "measure", label: "Đo lường" }, { id: "time", label: "Thời gian" }],
          hintLadder: ["Đọc đơn vị hoặc dấu hiệu.", "Gang tay nói về độ dài; giờ nói về thời gian.", "Đặt từng thẻ vào đúng cổng."],
        };
      }
      if (profile.mode === "shape") {
        return {
          ...common,
          promptVi: "Phân loại hình có nét cong và hình có cạnh thẳng.",
          items: [{ id: `${level.id}-round`, label: "Hình tròn", symbol: "●", count: 1, bucket: "curve" }, { id: `${level.id}-triangle`, label: "Hình tam giác", symbol: "▲", count: 1, bucket: "edge" }],
          buckets: [{ id: "curve", label: "Có nét cong" }, { id: "edge", label: "Có cạnh thẳng" }],
          hintLadder: ["Nhìn đường bao của từng hình.", "Hình tròn có nét cong; tam giác có cạnh thẳng.", "Đặt mỗi hình vào đúng cổng."],
        };
      }
      if (profile.mode !== "number") {
        return {
          ...common,
          promptVi: `Phân loại ${profile.noun} theo dấu hiệu đang được gọi.`,
          items: [{ id: `${level.id}-first`, label: profile.values[0], symbol: grade1Symbol(profile, 0), count: 1, bucket: "first" }, { id: `${level.id}-second`, label: profile.values[1], symbol: grade1Symbol(profile, 1), count: 1, bucket: "second" }],
          buckets: [{ id: "first", label: profile.values[0] }, { id: "second", label: profile.values[1] }],
          hintLadder: ["Quan sát từng dấu hiệu.", `So sánh với ${profile.values[0]} và ${profile.values[1]}.`, "Đặt từng thẻ vào đúng cổng."],
        };
      }
      const less = 2 + (position % 2);
      const more = less + 2;
      return {
        ...common,
        promptVi: "So sánh hai nhóm rồi đặt nhóm ít hơn hoặc nhiều hơn.",
        items: [{ id: `${level.id}-less`, label: `Nhóm ${less} hạt`, symbol: profile.symbol, count: less, bucket: "less" }, { id: `${level.id}-more`, label: `Nhóm ${more} hạt`, symbol: profile.symbol, count: more, bucket: "more" }],
        buckets: [{ id: "more", label: "Nhiều hơn" }, { id: "less", label: "Ít hơn" }],
        hintLadder: [`Đếm nhóm ${less} và nhóm ${more}.`, `Nhóm ${more} nhiều hơn nhóm ${less}.`, "Đặt từng nhóm vào đúng cổng."],
      };
    }
    case "path": {
      let pathSequence = objectiveHas(objective, /trừ|bớt/i) && profile.mode === "number" ? [5, 4, 3, 2] : sequence;
      let pathPrompt = profile.mode === "number" && objectiveHas(objective, /trừ|bớt/i) ? "Nối các số đang giảm dần, mỗi bước bớt một." : `Nối ${profile.noun} theo quy luật đã học.`;
      let pathHelper = "Chỉ một lựa chọn làm sáng bước đang chờ.";
      if (objectiveHas(objective, /trang phục phù hợp/i)) {
        pathSequence = ["trời mưa", "mang áo mưa", "đi ủng", "giữ người khô"];
        pathPrompt = "Nối các bước chọn trang phục phù hợp khi trời mưa.";
        pathHelper = "Đi từ dấu hiệu thời tiết đến việc làm phù hợp.";
      } else if (objectiveHas(objective, /dùng giác quan phù hợp/i)) {
        pathSequence = ["quan sát", "chọn giác quan", "thử", "mô tả"];
        pathPrompt = "Nối các bước khám phá bằng giác quan.";
        pathHelper = "Làm lần lượt: quan sát, chọn, thử rồi mô tả.";
      } else if (objectiveHas(objective, /cơ thể \+ giác quan/i)) {
        pathSequence = ["gọi tên bộ phận", "chọn giác quan", "nhận tín hiệu", "mô tả"];
        pathPrompt = "Nối các bước dùng cơ thể và giác quan để khám phá.";
        pathHelper = "Gọi tên bộ phận, chọn giác quan rồi mô tả tín hiệu.";
      } else if (objectiveHas(objective, /bảo vệ cây/i)) {
        pathSequence = ["quan sát cây", "tưới vừa đủ", "không bẻ cành", "giữ cây khỏe"];
        pathPrompt = "Nối các việc làm giúp bảo vệ cây và môi trường.";
        pathHelper = "Chọn từng việc làm theo trình tự hợp lý.";
      } else if (objectiveHas(objective, /an toàn khi gần động vật/i)) {
        pathSequence = ["đứng xa", "xin phép người lớn", "chạm nhẹ", "rửa tay"];
        pathPrompt = "Nối các bước an toàn khi ở gần động vật.";
        pathHelper = "An toàn trước, tương tác nhẹ nhàng sau.";
      } else if (objectiveHas(objective, /sắp xếp hoạt động trong ngày/i)) {
        pathSequence = ["buổi sáng", "buổi trưa", "buổi chiều", "buổi tối"];
        pathPrompt = "Nối các thời điểm trong một ngày theo thứ tự.";
        pathHelper = "Bắt đầu từ buổi sáng và kết thúc ở buổi tối.";
      } else if (objectiveHas(objective, /ghép hình tạo hình mới/i)) {
        pathSequence = ["chọn hình", "đặt cạnh", "ghép lại", "hình mới"];
        pathPrompt = "Nối các bước ghép hình tạo thành hình mới.";
        pathHelper = "Chọn hình, đặt cạnh rồi kiểm tra hình mới.";
      }
      const pathDistractor = profile.mode === "number"
        ? pathSequence[0] + pathSequence.length + 1
        : "không theo quy luật";
      return {
        ...common,
        promptVi: pathPrompt,
        sequence: pathSequence,
        choices: shuffle([...pathSequence, pathDistractor], seed),
        helperVi: pathHelper,
        hintLadder: [profile.sequenceRuleVi, `Bậc đầu tiên là ${pathSequence[0]}.`, "Chọn từng bậc theo thứ tự, không chọn ngẫu nhiên."],
      };
    }
    case "build-repair": {
      if (objectiveHas(objective, /phép trừ như tách ra/i)) {
        return buildRepairContent(level, common, profile, ["Có 5 hạt", "Bớt 2 hạt", "Còn 3 hạt"], "Lắp 3 bước của phép trừ: có 5, bớt 2, còn 3.", "Sơ đồ phép trừ");
      }
      if (objectiveHas(objective, /nhận biết hình vuông/i)) {
        return buildRepairContent(level, common, profile, ["Hình vuông"], "Chọn đúng hình vuông để hoàn thành ô sáng.", "Bộ hình đang sửa");
      }
      if (objectiveHas(objective, /hoạt động phù hợp thời tiết/i)) {
        return buildRepairContent(level, common, profile, ["trời mưa", "mang áo mưa"], "Lắp cặp dấu hiệu và hoạt động phù hợp khi trời mưa.", "Bảng chọn hoạt động");
      }
      if (objectiveHas(objective, /bảo vệ động vật và nơi sống/i)) {
        return buildRepairContent(level, common, profile, ["con vật", "nơi sống", "cách bảo vệ"], "Lắp đủ 3 phần để bảo vệ con vật và nơi sống.", "Bản đồ bảo vệ động vật");
      }
      if (objectiveHas(objective, /ghép cây\/con vật với môi trường/i)) {
        return buildRepairContent(level, common, profile, ["cây hoặc con vật", "nơi sống", "dấu hiệu chăm sóc"], "Ghép đối tượng với môi trường và cách chăm sóc phù hợp.", "Bản đồ môi trường sống");
      }
      if (objectiveHas(objective, /thực vật \+ chăm sóc/i)) {
        return buildRepairContent(level, common, profile, ["cây", "nước", "ánh sáng"], "Lắp đủ các điều kiện giúp cây sống và lớn lên.", "Bản đồ chăm sóc cây");
      }
      const pieceLabels = profile.values.slice(0, targetCount);
      const slotChoices = pieceLabels.map((_, index) => `${level.id}-piece-${index + 1}`);
      return {
        ...common,
        target: targetCount,
        promptVi: `Lắp đủ ${targetCount} mảnh để hoàn thành: ${level.learningObjectiveVi}.`,
        slotChoices,
        slotLabels: pieceLabels,
        structureLabelVi: profile.mode === "body" ? "Bản đồ cơ thể" : profile.mode === "shape" ? "Bộ hình đang sửa" : `Cấu trúc ${profile.domainVi.toLowerCase()}`,
        choices: [...pieceLabels.map((label, index) => ({ id: slotChoices[index], label, symbol: grade1Symbol(profile, index) })), { id: `${level.id}-extra`, label: "Mảnh thừa", symbol: "◇", extra: true }],
        hintLadder: [`Công trình cần ${targetCount} mảnh.`, "Đếm ô đang trống.", "Chọn mảnh phù hợp với ô đang sáng."],
      };
    }
    case "simulation":
    case "resource-balance": {
      if (objectiveHas(objective, /phần chênh lệch/i)) {
        const correctId = `${level.id}-correct`;
        return {
          ...common,
          guideTitleVi: "Tìm phần chênh lệch",
          steps: ["Nhìn số lớn và số bé.", "Dùng phép trừ để so sánh.", "Chọn kết quả đúng."],
          ruleVi: "Phần chênh lệch bằng số lớn trừ số bé.",
          coreLabel: "Chênh lệch",
          coreHint: "Số lớn trừ số bé",
          statusIdleVi: "Chọn phép tính đúng",
          promptVi: "Chọn phép tính cho biết phần chênh lệch giữa 5 và 3.",
          splits: [{ id: correctId, label: "Đúng", detail: "5 − 3 = 2", left: 5, right: 3, correct: true }, { id: `${level.id}-wrong-1`, label: "Nhầm phép cộng", detail: "5 + 3 = 8", left: 5, right: 3, correct: false }, { id: `${level.id}-wrong-2`, label: "Đổi thứ tự", detail: "3 − 5", left: 3, right: 5, correct: false }],
          correct: correctId,
          hintLadder: ["Tìm số lớn và số bé.", "Phần chênh lệch dùng phép trừ.", "5 − 3 bằng 2."],
        };
      }
      if (objectiveHas(objective, /giải tình huống cộng/i)) {
        const correctId = `${level.id}-correct`;
        return {
          ...common,
          guideTitleVi: "Giải tình huống cộng",
          steps: ["Đọc nhóm ban đầu.", "Tìm phần được thêm.", "Chọn phép cộng đúng."],
          ruleVi: "Khi thêm vào, dùng phép cộng.",
          coreLabel: "Tình huống cộng",
          coreHint: "Nhóm ban đầu + phần thêm",
          promptVi: "Chọn cách tính đúng cho tình huống: có 2 quả, thêm 1 quả.",
          splits: [{ id: correctId, label: "Đúng", detail: "2 + 1 = 3", left: 2, right: 1, correct: true }, { id: `${level.id}-wrong-1`, label: "Bớt thay vì thêm", detail: "2 − 1 = 1", left: 2, right: 1, correct: false }, { id: `${level.id}-wrong-2`, label: "Đổi số", detail: "1 + 3 = 4", left: 1, right: 3, correct: false }],
          correct: correctId,
          hintLadder: ["Tình huống có phần được thêm.", "Dùng phép cộng.", "2 + 1 bằng 3."],
        };
      }
      if (objectiveHas(objective, /giải tình huống trừ/i)) {
        const correctId = `${level.id}-correct`;
        return {
          ...common,
          guideTitleVi: "Giải tình huống trừ",
          steps: ["Đọc số ban đầu.", "Tìm phần bị bớt.", "Chọn phép trừ đúng."],
          ruleVi: "Khi bớt đi, dùng phép trừ.",
          coreLabel: "Tình huống trừ",
          coreHint: "Số ban đầu − phần bớt",
          promptVi: "Chọn cách tính đúng cho tình huống: có 5 quả, bớt 2 quả.",
          splits: [{ id: correctId, label: "Đúng", detail: "5 − 2 = 3", left: 5, right: 2, correct: true }, { id: `${level.id}-wrong-1`, label: "Cộng thay vì bớt", detail: "5 + 2 = 7", left: 5, right: 2, correct: false }, { id: `${level.id}-wrong-2`, label: "Đổi số", detail: "2 − 5", left: 2, right: 5, correct: false }],
          correct: correctId,
          hintLadder: ["Tình huống có phần bị bớt.", "Dùng phép trừ.", "5 − 2 bằng 3."],
        };
      }
      if (objectiveHas(objective, /giác quan/i)) {
        const correctId = `${level.id}-correct`;
        return {
          ...common,
          guideTitleVi: "Ghép giác quan và chức năng",
          steps: ["Gọi tên giác quan.", "Nói chức năng của giác quan.", "Chọn cặp ghép đúng."],
          ruleVi: "Mỗi giác quan có chức năng phù hợp.",
          coreLabel: "Giác quan",
          coreHint: "Bộ phận → chức năng",
          promptVi: "Chọn cặp ghép đúng giữa giác quan và chức năng.",
          splits: [{ id: correctId, label: "Đúng", detail: "mắt → nhìn; tai → nghe", left: "mắt", right: "nhìn", correct: true }, { id: `${level.id}-wrong-1`, label: "Đổi chức năng", detail: "mắt → nghe; tai → nhìn", left: "mắt", right: "nghe", correct: false }, { id: `${level.id}-wrong-2`, label: "Bỏ qua giác quan", detail: "tay → nhìn", left: "tay", right: "nhìn", correct: false }],
          correct: correctId,
          hintLadder: ["Gọi tên từng giác quan.", "Mắt dùng để nhìn, tai dùng để nghe.", "Chọn cặp ghép đúng."],
        };
      }
      if (objectiveHas(objective, /nặng hơn|nhẹ hơn/i)) {
        const correctId = `${level.id}-correct`;
        return {
          ...common,
          guideTitleVi: "So sánh nặng và nhẹ",
          steps: ["Quan sát hai vật.", "So sánh trọng lượng.", "Chọn mô tả đúng."],
          ruleVi: "Mô tả phải đúng với trọng lượng nhìn thấy.",
          coreLabel: "So sánh trọng lượng",
          coreHint: "Vật nặng và vật nhẹ",
          promptVi: "Chọn cách mô tả đúng khi so sánh hai vật.",
          splits: [{ id: correctId, label: "Đúng", detail: "Túi đá nặng hơn túi bông", left: "đá", right: "bông", correct: true }, { id: `${level.id}-wrong-1`, label: "Đảo ngược", detail: "Túi bông nặng hơn túi đá", left: "bông", right: "đá", correct: false }, { id: `${level.id}-wrong-2`, label: "Không so sánh", detail: "Hai vật giống nhau", left: "?", right: "?", correct: false }],
          correct: correctId,
          hintLadder: ["Quan sát chất liệu của hai vật.", "Đá thường nặng hơn bông.", "Chọn mô tả đúng."],
        };
      }
      if (objectiveHas(objective, /giờ đúng/i)) {
        const correctId = `${level.id}-correct`;
        return {
          ...common,
          guideTitleVi: "Đọc giờ đúng",
          steps: ["Nhìn kim phút.", "Nhìn kim giờ.", "Chọn mặt đồng hồ đúng."],
          ruleVi: "Giờ đúng có kim phút ở số 12.",
          coreLabel: "Đồng hồ",
          coreHint: "Kim chỉ vào số 3",
          promptVi: "Chọn mặt đồng hồ chỉ đúng 3 giờ.",
          splits: [{ id: correctId, label: "Đúng", detail: "Kim giờ ở 3, kim phút ở 12", left: "3", right: "12", correct: true }, { id: `${level.id}-wrong-1`, label: "Nhầm kim", detail: "Kim giờ ở 12, kim phút ở 3", left: "12", right: "3", correct: false }, { id: `${level.id}-wrong-2`, label: "Chưa đúng giờ", detail: "Kim không tạo thành giờ đúng", left: "?", right: "?", correct: false }],
          correct: correctId,
          hintLadder: ["Giờ đúng có kim phút ở số 12.", "Kim giờ chỉ vào số cần đọc.", "Chọn 3 giờ."],
        };
      }
      if (objectiveHas(objective, /ăn uống phù hợp/i)) {
        const correctId = `${level.id}-correct`;
        return {
          ...common,
          guideTitleVi: "Chọn bữa ăn cân bằng",
          steps: ["Nhìn các món ăn.", "Tìm đủ nhóm thức ăn.", "Chọn bữa vừa phải."],
          ruleVi: "Bữa ăn phù hợp cần đủ nhóm và vừa phải.",
          coreLabel: "Bữa ăn cân bằng",
          coreHint: "Đủ nhóm và vừa phải",
          promptVi: "Chọn bữa ăn phù hợp cho cơ thể.",
          splits: [{ id: correctId, label: "Phù hợp", detail: "cơm + rau + cá + nước", left: "đủ nhóm", right: "vừa phải", correct: true }, { id: `${level.id}-wrong-1`, label: "Thiếu nhóm", detail: "chỉ ăn bánh ngọt", left: "ít nhóm", right: "nhiều đường", correct: false }, { id: `${level.id}-wrong-2`, label: "Không cân bằng", detail: "ăn quá nhiều một món", left: "một món", right: "quá nhiều", correct: false }],
          correct: correctId,
          hintLadder: ["Nhìn các món trong bữa ăn.", "Cơ thể cần nhiều nhóm thức ăn.", "Chọn bữa có đủ nhóm và vừa phải."],
        };
      }
      if (objectiveHas(objective, /Mặt Trăng/i)) {
        const correctId = `${level.id}-correct`;
        return {
          ...common,
          guideTitleVi: "Nhận biết Mặt Trăng",
          steps: ["Nhìn thời điểm trong ngày.", "Tìm dấu hiệu trên bầu trời.", "Chọn cảnh có Mặt Trăng."],
          ruleVi: "Mặt Trăng là dấu hiệu thường thấy trên bầu trời ban đêm.",
          coreLabel: "Bầu trời ban đêm",
          coreHint: "Mặt Trăng và ánh sáng",
          promptVi: "Chọn cảnh có dấu hiệu của Mặt Trăng.",
          splits: [{ id: correctId, label: "Đúng", detail: "Mặt Trăng xuất hiện trên trời tối", left: "ban đêm", right: "Mặt Trăng", correct: true }, { id: `${level.id}-wrong-1`, label: "Nhầm thời điểm", detail: "Mặt Trời giữa ban đêm", left: "ban đêm", right: "Mặt Trời", correct: false }, { id: `${level.id}-wrong-2`, label: "Thiếu bằng chứng", detail: "Bầu trời không có dấu hiệu", left: "?", right: "?", correct: false }],
          correct: correctId,
          hintLadder: ["Nhìn thời điểm trong ngày.", "Mặt Trăng thường được quan sát trên trời tối.", "Chọn cảnh có Mặt Trăng."],
        };
      }
      if (objectiveHas(objective, /thay đổi thời tiết/i)) {
        const correctId = `${level.id}-correct`;
        return {
          ...common,
          guideTitleVi: "Theo dõi thời tiết thay đổi",
          steps: ["Nhìn dấu hiệu đầu tiên.", "Theo dõi mây xuất hiện.", "Chọn dãy thay đổi hợp lý."],
          ruleVi: "Dãy thời tiết phải giữ đúng thứ tự các dấu hiệu quan sát được.",
          coreLabel: "Dòng thời tiết",
          coreHint: "Dấu hiệu thay đổi",
          promptVi: "Chọn mô tả đúng về một lần thay đổi thời tiết.",
          splits: [{ id: correctId, label: "Đúng", detail: "trời nắng → có mây → trời mưa", left: "nắng", right: "mưa", correct: true }, { id: `${level.id}-wrong-1`, label: "Đảo chiều", detail: "trời mưa → mặt trời → có mây", left: "mưa", right: "nắng", correct: false }, { id: `${level.id}-wrong-2`, label: "Không theo dõi", detail: "Không có dấu hiệu thay đổi", left: "?", right: "?", correct: false }],
          correct: correctId,
          hintLadder: ["Nhìn các dấu hiệu trong bầu trời.", "Mây có thể xuất hiện trước mưa.", "Chọn dãy nắng → mây → mưa."],
        };
      }
      if (objectiveHas(objective, /mua–nhận vật phẩm/i)) {
        const correctId = `${level.id}-correct`;
        return {
          ...common,
          guideTitleVi: "Tính khi mua và nhận đồ",
          steps: ["Đọc số tiền ban đầu.", "Tính phần mua hoặc nhận thêm.", "Chọn kết quả đúng."],
          ruleVi: "Tình huống mua và nhận đồ phải giữ đúng số lượng hoặc số tiền.",
          coreLabel: "Mua và nhận",
          coreHint: "Số ban đầu → thay đổi → kết quả",
          promptVi: "Chọn cách tính đúng: có 5 xu, mua món 2 xu, còn lại bao nhiêu?",
          splits: [{ id: correctId, label: "Đúng", detail: "5 − 2 = 3 xu", left: 5, right: 2, correct: true }, { id: `${level.id}-wrong-1`, label: "Cộng nhầm", detail: "5 + 2 = 7 xu", left: 5, right: 2, correct: false }, { id: `${level.id}-wrong-2`, label: "Đổi số", detail: "2 − 5", left: 2, right: 5, correct: false }],
          correct: correctId,
          hintLadder: ["Mua đồ làm số xu giảm.", "Dùng phép trừ.", "5 − 2 còn 3 xu."],
        };
      }
      if (objectiveHas(objective, /hành vi sức khỏe\/an toàn/i)) {
        const correctId = `${level.id}-correct`;
        return {
          ...common,
          guideTitleVi: "Chọn hành vi an toàn",
          steps: ["Đọc tình huống.", "Tìm việc làm bảo vệ cơ thể.", "Chọn hành vi đúng."],
          ruleVi: "Hành vi đúng phải giúp cơ thể khỏe mạnh hoặc tránh nguy hiểm.",
          coreLabel: "Sức khỏe và an toàn",
          coreHint: "Việc làm → kết quả",
          promptVi: "Chọn cách xử lý an toàn trong tình huống quen thuộc.",
          splits: [{ id: correctId, label: "An toàn", detail: "rửa tay và báo người lớn khi gặp nguy hiểm", left: "rửa tay", right: "báo người lớn", correct: true }, { id: `${level.id}-wrong-1`, label: "Bỏ qua", detail: "tiếp tục khi thấy nguy hiểm", left: "tiếp tục", right: "nguy hiểm", correct: false }, { id: `${level.id}-wrong-2`, label: "Gây hại", detail: "chạm vào vật lạ", left: "chạm", right: "vật lạ", correct: false }],
          correct: correctId,
          hintLadder: ["Dừng lại và quan sát.", "Tìm việc bảo vệ cơ thể.", "Chọn rửa tay hoặc báo người lớn đúng lúc."],
        };
      }
      if (objectiveHas(objective, /đếm và so sánh/i)) {
        const correctId = `${level.id}-correct`;
        return {
          ...common,
          guideTitleVi: "Đếm rồi so sánh",
          steps: ["Đếm từng nhóm.", "So sánh số lượng.", "Chọn kết luận đúng."],
          ruleVi: "Kết luận phải dựa trên số đã đếm.",
          coreLabel: "Hai nhóm vật",
          coreHint: "Đếm → so sánh",
          promptVi: "Chọn kết luận đúng: nhóm A có 3 vật, nhóm B có 5 vật.",
          splits: [{ id: correctId, label: "Đúng", detail: "Nhóm B nhiều hơn nhóm A", left: 5, right: 3, correct: true }, { id: `${level.id}-wrong-1`, label: "Đảo ngược", detail: "Nhóm A nhiều hơn nhóm B", left: 3, right: 5, correct: false }, { id: `${level.id}-wrong-2`, label: "Không đếm", detail: "Hai nhóm bằng nhau", left: "?", right: "?", correct: false }],
          correct: correctId,
          hintLadder: ["Đếm nhóm A và nhóm B.", "So sánh 3 với 5.", "Nhóm B nhiều hơn nhóm A."],
        };
      }
      if (objectiveHas(objective, /nơi sống/i)) {
        const correctId = `${level.id}-correct`;
        const isPlant = profile.mode === "plant";
        return {
          ...common,
          guideTitleVi: "Ghép đối tượng với nơi sống",
          steps: ["Gọi tên đối tượng.", "Nhìn điều kiện nơi sống.", "Chọn cặp phù hợp."],
          ruleVi: "Nơi sống phải phù hợp với nhu cầu của đối tượng.",
          coreLabel: "Nơi sống",
          coreHint: "Đối tượng → môi trường",
          promptVi: isPlant ? "Chọn môi trường giúp cây sống và lớn lên." : "Chọn nơi sống phù hợp với con vật.",
          splits: isPlant
            ? [{ id: correctId, label: "Đúng", detail: "cây → đất, nước và ánh sáng", left: "cây", right: "đất", correct: true }, { id: `${level.id}-wrong-1`, label: "Thiếu điều kiện", detail: "cây → nơi không có nước", left: "cây", right: "khô", correct: false }, { id: `${level.id}-wrong-2`, label: "Không phù hợp", detail: "cây → dưới nước sâu", left: "cây", right: "nước sâu", correct: false }]
            : [{ id: correctId, label: "Đúng", detail: "cá → dưới nước", left: "cá", right: "nước", correct: true }, { id: `${level.id}-wrong-1`, label: "Đổi nơi sống", detail: "cá → trên cành cây", left: "cá", right: "cây", correct: false }, { id: `${level.id}-wrong-2`, label: "Không phù hợp", detail: "cá → nơi khô", left: "cá", right: "khô", correct: false }],
          correct: correctId,
          hintLadder: ["Nhìn đối tượng trước.", isPlant ? "Cây cần đất, nước và ánh sáng." : "Con vật cần nơi có điều kiện phù hợp.", "Chọn cặp đúng."],
        };
      }
      if (objectiveHas(objective, /chăm sóc/i)) {
        const correctId = `${level.id}-correct`;
        return {
          ...common,
          guideTitleVi: "Chọn cách chăm sóc đúng",
          steps: ["Quan sát cây.", "Tìm việc làm có ích.", "Chọn cách chăm sóc."],
          ruleVi: "Chăm sóc đúng giúp cây sống khỏe mà không gây hại.",
          coreLabel: "Chăm cây",
          coreHint: "Việc làm → kết quả",
          promptVi: "Chọn cách chăm sóc giúp cây sống khỏe.",
          splits: [{ id: correctId, label: "Đúng", detail: "tưới vừa đủ và đặt nơi có ánh sáng", left: "tưới", right: "ánh sáng", correct: true }, { id: `${level.id}-wrong-1`, label: "Quá nhiều", detail: "tưới ngập nước", left: "quá nhiều", right: "nước", correct: false }, { id: `${level.id}-wrong-2`, label: "Gây hại", detail: "bẻ cành", left: "bẻ", right: "cành", correct: false }],
          correct: correctId,
          hintLadder: ["Cây cần nước nhưng không cần quá nhiều.", "Ánh sáng giúp cây lớn.", "Chọn cách tưới vừa đủ và giữ cây nguyên vẹn."],
        };
      }
      if (objectiveHas(objective, /trái–phải|trái-phải/i)) {
        const correctId = `${level.id}-correct`;
        return {
          ...common,
          guideTitleVi: "Nhận biết vị trí trái và phải",
          steps: ["Chọn vật làm mốc.", "Nhìn phía trái và phải.", "Chọn mô tả đúng."],
          ruleVi: "Mô tả vị trí phải dựa trên cùng một vật làm mốc.",
          coreLabel: "Vị trí",
          coreHint: "Vật → phía của vật",
          promptVi: "Chọn mô tả đúng vị trí của quả bóng so với hộp.",
          splits: [{ id: correctId, label: "Đúng", detail: "Bóng ở bên trái hộp", left: "trái", right: "hộp", correct: true }, { id: `${level.id}-wrong-1`, label: "Đảo vị trí", detail: "Bóng ở bên phải hộp", left: "phải", right: "hộp", correct: false }, { id: `${level.id}-wrong-2`, label: "Không có mốc", detail: "Không xác định được vị trí", left: "?", right: "?", correct: false }],
          correct: correctId,
          hintLadder: ["Chọn hộp làm mốc.", "Nhìn quả bóng nằm phía nào.", "Chọn mô tả bóng ở bên trái hộp."],
        };
      }
      if (profile.mode === "number") {
        const total = 6;
        const left = 2 + (position % 2);
        const right = total - left;
        return {
          ...common,
          total,
          coreLabel: total,
          coreHint: "hạt trong nhóm",
          promptVi: "Chọn cách tách vẫn giữ nguyên tổng số hạt.",
          splits: [{ id: `${level.id}-correct`, label: "Giữ đủ tổng", left, right, correct: true }, { id: `${level.id}-low`, label: "Thiếu một hạt", left: left - 1, right, correct: false }, { id: `${level.id}-high`, label: "Thừa một hạt", left, right: right + 1, correct: false }],
          correct: `${level.id}-correct`,
          hintLadder: [`Tổng ban đầu là ${total}.`, "Cộng hai phần của từng lựa chọn.", `Chọn cách cộng lại bằng ${total}.`],
        };
      }
      const correctId = `${level.id}-correct`;
      return {
        ...common,
        guideTitleVi: "Chọn cách phù hợp",
        steps: ["Đọc yêu cầu của chặng.", "So sánh dấu hiệu trong từng lựa chọn.", "Chọn phương án có bằng chứng."],
        ruleVi: "Lựa chọn đúng phải giải thích được bằng dấu hiệu của bài.",
        promptVi: `Chọn cách phù hợp với bài: ${level.learningObjectiveVi}.`,
        splits: [{ id: correctId, label: "Cách phù hợp", detail: `${profile.values[0]} và ${profile.values[1]}`, left: profile.values[0], right: profile.values[1], correct: true }, { id: `${level.id}-wrong-1`, label: "Bỏ qua dấu hiệu", detail: "Chọn khi chưa quan sát", left: "?", right: "?", correct: false }, { id: `${level.id}-wrong-2`, label: "Làm ngược thứ tự", detail: "Chưa kiểm tra kết quả", left: "?", right: "?", correct: false }],
        correct: correctId,
        hintLadder: ["Đọc yêu cầu của chặng.", `Cách phù hợp bắt đầu từ ${profile.values[0]}.`, "Chọn phương án có đủ bước quan sát và kiểm tra."],
      };
    }
    case "match": {
      if (objectiveHas(objective, /quan hệ cộng–trừ/i)) {
        return {
          ...common,
          guideTitleVi: "Kiểm tra quan hệ cộng và trừ",
          steps: ["Đọc phép tính.", "Tính hoặc đọc kết quả.", "Kiểm tra từng dòng khớp nhau."],
          ruleVi: "Hai phần của một dòng phải thể hiện cùng một quan hệ số.",
          promptVi: "Kiểm tra từng dòng: phép cộng và kết quả phải khớp nhau.",
          mergeLabelVi: "Phép cộng → kết quả",
          pairs: [{ id: `${level.id}-pair-1`, leftLabel: "2 + 3", rightLabel: "5", total: 5, correct: true }, { id: `${level.id}-pair-2`, leftLabel: "5 − 2", rightLabel: "3", total: 3, correct: true }, { id: `${level.id}-pair-3`, leftLabel: "4 + 1", rightLabel: "5", total: 5, correct: true }],
          hintLadder: ["Đọc phép tính bên trái.", "Tính rồi so sánh với kết quả.", "Kiểm tra từng dòng đều khớp."],
        };
      }
      if (objectiveHas(objective, /mắt dùng để nhìn/i)) {
        return {
          ...common,
          guideTitleVi: "Ghép bộ phận với chức năng",
          steps: ["Gọi tên bộ phận.", "Nói chức năng.", "Kiểm tra từng cặp."],
          ruleVi: "Mỗi bộ phận phải đi cùng chức năng đúng.",
          promptVi: "Kiểm tra các cặp bộ phận và chức năng.",
          mergeLabelVi: "Bộ phận → chức năng",
          pairs: [{ id: `${level.id}-pair-1`, leftLabel: "mắt", rightLabel: "nhìn", correct: true }, { id: `${level.id}-pair-2`, leftLabel: "tai", rightLabel: "nghe", correct: true }, { id: `${level.id}-pair-3`, leftLabel: "mũi", rightLabel: "ngửi", correct: true }],
          hintLadder: ["Gọi tên bộ phận.", "Nói chức năng của bộ phận đó.", "Kiểm tra từng cặp đúng."],
        };
      }
      if (objectiveHas(objective, /bộ phận bên ngoài của cây/i)) {
        return {
          ...common,
          guideTitleVi: "Ghép bộ phận cây với chức năng",
          steps: ["Gọi tên bộ phận cây.", "Nói chức năng của nó.", "Kiểm tra từng cặp."],
          ruleVi: "Mỗi bộ phận cây phải đi cùng chức năng phù hợp.",
          promptVi: "Kiểm tra mối liên hệ giữa bộ phận của cây và chức năng.",
          mergeLabelVi: "Bộ phận cây → chức năng",
          pairs: [{ id: `${level.id}-pair-1`, leftLabel: "rễ", rightLabel: "hút nước", correct: true }, { id: `${level.id}-pair-2`, leftLabel: "thân", rightLabel: "nâng cây", correct: true }, { id: `${level.id}-pair-3`, leftLabel: "lá", rightLabel: "nhận ánh sáng", correct: true }],
          hintLadder: ["Nhìn tên bộ phận.", "Nói việc bộ phận đó giúp cây làm.", "Kiểm tra từng cặp."],
        };
      }
      if (objectiveHas(objective, /đo độ dài.*công cụ/i)) {
        return {
          ...common,
          guideTitleVi: "Chọn công cụ đo phù hợp",
          steps: ["Đọc đại lượng.", "Nhớ công cụ đo.", "Kiểm tra từng cặp."],
          ruleVi: "Công cụ phải phù hợp với đại lượng cần đo.",
          promptVi: "Kiểm tra vật cần đo và công cụ phù hợp.",
          mergeLabelVi: "Đại lượng → công cụ",
          pairs: [{ id: `${level.id}-pair-1`, leftLabel: "độ dài", rightLabel: "thước", correct: true }, { id: `${level.id}-pair-2`, leftLabel: "thời gian", rightLabel: "đồng hồ", correct: true }, { id: `${level.id}-pair-3`, leftLabel: "khối lượng", rightLabel: "cân", correct: true }],
          hintLadder: ["Đọc đại lượng cần đo.", "Nhớ công cụ dùng cho đại lượng đó.", "Kiểm tra từng cặp."],
        };
      }
      if (objectiveHas(objective, /phân loại vật theo hình dạng/i)) {
        return {
          ...common,
          guideTitleVi: "Ghép đồ vật với hình dạng",
          steps: ["Quan sát đường bao.", "Gọi tên hình.", "Kiểm tra từng cặp."],
          ruleVi: "Hình được chọn phải khớp với đồ vật đang quan sát.",
          promptVi: "Kiểm tra đồ vật và hình dạng nổi bật của đồ vật.",
          mergeLabelVi: "Đồ vật → hình dạng",
          pairs: [{ id: `${level.id}-pair-1`, leftLabel: "cái đĩa", rightLabel: "hình tròn", correct: true }, { id: `${level.id}-pair-2`, leftLabel: "biển báo", rightLabel: "hình tam giác", correct: true }, { id: `${level.id}-pair-3`, leftLabel: "quyển sách", rightLabel: "hình chữ nhật", correct: true }],
          hintLadder: ["Nhìn đường bao của đồ vật.", "Gọi tên hình quen thuộc.", "Kiểm tra từng cặp."],
        };
      }
      if (objectiveHas(objective, /con vật quen thuộc/i)) {
        return {
          ...common,
          guideTitleVi: "Ghép con vật với dấu hiệu",
          steps: ["Gọi tên con vật.", "Nhìn dấu hiệu.", "Kiểm tra từng cặp."],
          ruleVi: "Dấu hiệu phải thuộc về con vật đang ghép.",
          promptVi: "Kiểm tra từng cặp con vật và dấu hiệu quen thuộc.",
          mergeLabelVi: "Con vật → dấu hiệu",
          pairs: [{ id: `${level.id}-pair-1`, leftLabel: "con mèo", rightLabel: "kêu meo meo", correct: true }, { id: `${level.id}-pair-2`, leftLabel: "con cá", rightLabel: "bơi dưới nước", correct: true }, { id: `${level.id}-pair-3`, leftLabel: "con chim", rightLabel: "có cánh", correct: true }],
          hintLadder: ["Gọi tên con vật.", "Nhìn dấu hiệu dễ nhận biết.", "Kiểm tra từng cặp."],
        };
      }
      if (objectiveHas(objective, /số lượng \+ thời tiết/i)) {
        return {
          ...common,
          guideTitleVi: "Kết hợp số lượng và thời tiết",
          steps: ["Đếm vật.", "Đọc thời tiết.", "Kiểm tra lựa chọn phù hợp."],
          ruleVi: "Một cặp đúng phải khớp cả số lượng, thời tiết và việc làm.",
          promptVi: "Kiểm tra từng cặp gồm số lượng, thời tiết và lựa chọn phù hợp.",
          mergeLabelVi: "Dấu hiệu → lựa chọn",
          pairs: [{ id: `${level.id}-pair-1`, leftLabel: "3 vật · trời mưa", rightLabel: "mang áo mưa", correct: true }, { id: `${level.id}-pair-2`, leftLabel: "5 vật · trời nắng", rightLabel: "đội mũ", correct: true }, { id: `${level.id}-pair-3`, leftLabel: "2 vật · trời lạnh", rightLabel: "mặc áo ấm", correct: true }],
          hintLadder: ["Đếm vật và đọc thời tiết.", "Tìm việc làm phù hợp với cả hai dấu hiệu.", "Kiểm tra từng cặp."],
        };
      }
      if (objectiveHas(objective, /thời tiết.*hành vi/i)) {
        return {
          ...common,
          guideTitleVi: "Ghép thời tiết với hành vi",
          steps: ["Đọc dấu hiệu thời tiết.", "Nghĩ đến việc giữ an toàn.", "Kiểm tra từng cặp."],
          ruleVi: "Hành vi phải phù hợp với thời tiết đang quan sát.",
          promptVi: "Kiểm tra thời tiết và hành vi phù hợp.",
          mergeLabelVi: "Thời tiết → hành vi",
          pairs: [{ id: `${level.id}-pair-1`, leftLabel: "trời mưa", rightLabel: "mang áo mưa", correct: true }, { id: `${level.id}-pair-2`, leftLabel: "trời nắng", rightLabel: "đội mũ", correct: true }, { id: `${level.id}-pair-3`, leftLabel: "trời lạnh", rightLabel: "mặc áo ấm", correct: true }],
          hintLadder: ["Đọc dấu hiệu thời tiết.", "Nghĩ đến việc giữ cơ thể an toàn.", "Kiểm tra từng cặp."],
        };
      }
      if (profile.mode === "number") {
        const total = level.chapter === 2 ? 6 : 5;
        return {
          ...common,
          promptVi: `Gộp các cặp hạt để mỗi dòng tạo thành ${total}.`,
          mergeLabelVi: `Hai nhóm → ${total}`,
          pairs: [1, 2, 3].map((left, index) => ({ id: `${level.id}-pair-${index + 1}`, left, right: total - left, total, correct: true })),
          hintLadder: ["Nhìn hai nhóm trong một dòng.", "Đếm rồi cộng hai nhóm.", `Chọn các dòng có tổng bằng ${total}.`],
        };
      }
      return {
        ...common,
        guideTitleVi: "Kiểm tra từng mối liên hệ",
        steps: ["Nhìn hai phần của dòng.", "Nói mối liên hệ giữa chúng.", "Chạm để kiểm tra."],
        ruleVi: "Hai phần phải có mối liên hệ phù hợp với mục tiêu.",
        promptVi: `Ghép ${profile.values[0]} với ${profile.values[1]} theo mối liên hệ phù hợp.`,
        mergeLabelVi: "Kiểm tra từng mối liên hệ",
        pairs: profile.values.slice(0, 3).map((value, index) => ({ id: `${level.id}-pair-${index + 1}`, left: 1, right: 1, leftLabel: value, rightLabel: profile.values[(index + 1) % profile.values.length], total: 2, correct: true })),
        hintLadder: ["Nhìn hai thẻ trong mỗi dòng.", "Nói mối liên hệ giữa hai thẻ.", "Chọn dòng có mối liên hệ đúng với yêu cầu."],
      };
    }
    case "sequence": {
      if (/bớt vật/i.test(objective) || level.id === "g1-l008") {
        return { ...common, guideTitleVi: "Bớt hạt để còn đúng số", steps: ["Đếm số hạt ban đầu.", "Nhìn số hạt cần còn lại.", "Chọn số hạt cần lấy ra."], variant: "subtract", start: 5, target: 3, correct: 2, choices: [1, 2, 3], promptVi: "Có 5 hạt. Cần bớt bao nhiêu để còn 3 hạt?", helperVi: "Chọn số hạt cần lấy ra, rồi kiểm tra phép tính.", ruleVi: "Số ban đầu trừ số lấy ra phải bằng số còn lại.", hintLadder: ["Bắt đầu với 5 hạt.", "Mục tiêu là còn 3 hạt.", "5 - 2 = 3 nên cần bớt 2 hạt."] };
      }
      const missingIndex = 2;
      let sequenceForTask = sequence;
      let sequenceRule = profile.sequenceRuleVi;
      if (objectiveHas(objective, /ghép hình tạo hình mới/i)) {
        sequenceForTask = ["chọn hình", "đặt cạnh", "ghép lại", "hình mới"];
        sequenceRule = "Ghép hình theo trình tự: chọn → đặt → ghép → tạo hình mới.";
      } else if (objectiveHas(objective, /nhận biết tai dùng để nghe/i)) {
        sequenceForTask = ["tai", "nghe", "âm thanh", "hiểu"];
        sequenceRule = "Tai nhận âm thanh để nghe và hiểu.";
      } else if (objectiveHas(objective, /phân biệt cây theo đặc điểm/i)) {
        sequenceForTask = ["nhìn lá", "nhìn thân", "so sánh", "gọi tên"];
        sequenceRule = "Quan sát dấu hiệu rồi so sánh trước khi gọi tên cây.";
      } else if (objectiveHas(objective, /bộ phận bên ngoài của động vật/i)) {
        sequenceForTask = ["nhìn đầu", "nhìn thân", "nhìn chân hoặc cánh", "gọi tên"];
        sequenceRule = "Quan sát từng bộ phận bên ngoài rồi gọi tên con vật.";
      } else if (objectiveHas(objective, /tổng hợp nhiều kỹ năng/i)) {
        sequenceForTask = ["quan sát", "đếm", "kiểm tra", "giải thích"];
        sequenceRule = "Một kết luận tốt cần quan sát, đếm, kiểm tra rồi giải thích.";
      }
      const missing = sequenceForTask[missingIndex];
      return {
        ...common,
        guideTitleVi: "Điền vào chỗ trống",
        steps: ["Nhìn các bước ở hai bên ô trống.", "Nói quy luật chuyển bước.", "Chọn giá trị còn thiếu."],
        variant: "missing-sequence",
        sequence: sequenceForTask,
        visibleSequence: sequenceForTask.map((value, index) => index === missingIndex ? null : value),
        missingIndex,
        choices: shuffle([missing, sequenceForTask[missingIndex - 1], profile.mode === "number" ? sequenceForTask[missingIndex] + 1 : "không theo quy luật"], seed),
        promptVi: `Tìm bước còn thiếu trong dãy ${sequenceForTask[0]} → ${sequenceForTask[1]} → ? → ${sequenceForTask[3]}.`,
        helperVi: "Nhìn các bước đã có rồi chọn đúng ô có dấu hỏi.",
        ruleVi: sequenceRule,
        hintLadder: [`Dãy bắt đầu bằng ${sequenceForTask[0]} rồi ${sequenceForTask[1]}.`, "Tìm nhịp chuyển từ bước trước sang bước sau.", `Bước còn thiếu là ${missing}.`],
      };
    }
    case "observation": {
      if (objectiveHas(objective, /vị trí trên–dưới/i)) {
        return {
          ...common,
          promptVi: "Quan sát vị trí rồi chọn cảnh đúng với yêu cầu trên–dưới.",
          scenes: [{ id: `${level.id}-correct`, label: "Quả bóng ở trên hộp", evidence: "Bóng ở trên · hộp ở dưới", correct: true }, { id: `${level.id}-missing`, label: "Hai vật ở cùng chỗ", evidence: "Chưa có vị trí trên–dưới", correct: false }, { id: `${level.id}-wrong`, label: "Quả bóng ở dưới hộp", evidence: "Vị trí bị đảo ngược", correct: false }],
          hintLadder: ["Nhìn vị trí của hai vật.", "Xác định vật nào ở trên và vật nào ở dưới.", "Chọn cảnh có bóng ở trên hộp."],
        };
      }
      if (objectiveHas(objective, /giải tình huống cộng/i)) {
        return {
          ...common,
          promptVi: "Quan sát rồi chọn cảnh thể hiện một phép cộng đúng.",
          scenes: [{ id: `${level.id}-correct`, label: "Có 2 quả, thêm 1 quả", evidence: "2 + 1 = 3", correct: true }, { id: `${level.id}-missing`, label: "Có 2 quả, không thêm", evidence: "Chưa có phần thêm", correct: false }, { id: `${level.id}-wrong`, label: "Có 2 quả, bớt 1 quả", evidence: "Đây là phép trừ", correct: false }],
          hintLadder: ["Tìm nhóm ban đầu.", "Tìm phần được thêm vào.", "Chọn cảnh có 2 + 1 = 3."],
        };
      }
      if (objectiveHas(objective, /vệ sinh tay/i)) {
        return {
          ...common,
          promptVi: "Chọn cảnh có hành vi vệ sinh cơ thể đúng.",
          scenes: [{ id: `${level.id}-correct`, label: "Rửa tay trước khi ăn", evidence: "Có xà phòng và nước sạch", correct: true }, { id: `${level.id}-missing`, label: "Chỉ lau tay vào áo", evidence: "Chưa rửa sạch", correct: false }, { id: `${level.id}-wrong`, label: "Ăn khi tay bẩn", evidence: "Không an toàn cho sức khỏe", correct: false }],
          hintLadder: ["Nhìn tay và dụng cụ trong cảnh.", "Tay sạch giúp phòng bệnh.", "Chọn cảnh rửa tay bằng xà phòng."],
        };
      }
      if (objectiveHas(objective, /ghép cây với nơi sống/i)) {
        return {
          ...common,
          promptVi: "Chọn cảnh ghép cây với nơi sống phù hợp.",
          scenes: [{ id: `${level.id}-correct`, label: "Cây ở nơi có đất, nước và ánh sáng", evidence: "Đủ điều kiện để cây sống", correct: true }, { id: `${level.id}-missing`, label: "Cây không có nước", evidence: "Thiếu điều kiện sống", correct: false }, { id: `${level.id}-wrong`, label: "Cây bị đặt trong nơi không phù hợp", evidence: "Không khớp môi trường", correct: false }],
          hintLadder: ["Nghĩ cây cần gì để sống.", "Đất, nước và ánh sáng là các dấu hiệu quan trọng.", "Chọn cảnh có đủ điều kiện."],
        };
      }
      if (objectiveHas(objective, /phân loại động vật/i)) {
        return {
          ...common,
          promptVi: "Quan sát dấu hiệu rồi chọn cảnh phân loại động vật đúng.",
          scenes: [{ id: `${level.id}-correct`, label: "Chim có cánh, cá sống dưới nước", evidence: "Mỗi con vật có dấu hiệu riêng", correct: true }, { id: `${level.id}-missing`, label: "Đổi nơi sống của hai con vật", evidence: "Dấu hiệu không khớp", correct: false }, { id: `${level.id}-wrong`, label: "Không có dấu hiệu để so sánh", evidence: "Chưa đủ bằng chứng", correct: false }],
          hintLadder: ["Nhìn bộ phận và nơi sống.", "Chim có cánh; cá sống dưới nước.", "Chọn cảnh khớp cả hai dấu hiệu."],
        };
      }
      if (objectiveHas(objective, /Mặt Trời/i)) {
        return {
          ...common,
          promptVi: "Chọn cảnh có dấu hiệu của Mặt Trời.",
          scenes: [{ id: `${level.id}-correct`, label: "Mặt Trời chiếu sáng ban ngày", evidence: "Bầu trời sáng và có Mặt Trời", correct: true }, { id: `${level.id}-missing`, label: "Bầu trời nhiều mây, không thấy Mặt Trời", evidence: "Thiếu dấu hiệu cần tìm", correct: false }, { id: `${level.id}-wrong`, label: "Bầu trời ban đêm có Mặt Trăng", evidence: "Đây là dấu hiệu khác", correct: false }],
          hintLadder: ["Nhìn bầu trời trong từng cảnh.", "Mặt Trời thường làm cảnh ban ngày sáng.", "Chọn cảnh có Mặt Trời."],
        };
      }
      if (objectiveHas(objective, /ước lượng đơn giản/i)) {
        return {
          ...common,
          promptVi: "Chọn cách quan sát phù hợp để ước lượng độ dài.",
          scenes: [{ id: `${level.id}-correct`, label: "Đặt hai vật cạnh nhau", evidence: "Có thể so sánh dài–ngắn trực tiếp", correct: true }, { id: `${level.id}-missing`, label: "Nhìn từ xa không đặt cạnh nhau", evidence: "Khó so sánh chính xác", correct: false }, { id: `${level.id}-wrong`, label: "Đo bằng vật không cùng điểm bắt đầu", evidence: "Cách đo chưa đúng", correct: false }],
          hintLadder: ["Muốn so sánh, cần cùng điểm bắt đầu.", "Đặt hai vật cạnh nhau.", "Chọn cảnh cho phép nhìn rõ dài–ngắn."],
        };
      }
      if (objectiveHas(objective, /đếm vật trong scene/i)) {
        return {
          ...common,
          promptVi: "Đếm từng nhóm rồi chọn cảnh có số lượng được mô tả đúng.",
          scenes: [{ id: `${level.id}-correct`, label: "Cảnh có 3 quả và 2 khối", evidence: "Đếm được 3 + 2 vật", correct: true }, { id: `${level.id}-missing`, label: "Cảnh có 3 quả nhưng thiếu khối", evidence: "Chưa đủ nhóm vật", correct: false }, { id: `${level.id}-wrong`, label: "Cảnh đếm nhầm số quả", evidence: "Số lượng không khớp", correct: false }],
          hintLadder: ["Đếm từng nhóm riêng.", "Ghi nhớ số quả và số khối.", "Chọn cảnh có 3 quả và 2 khối."],
        };
      }
      const correctLabel = profile.mode === "number" ? "Bàn đủ số vật" : `Cảnh đúng với ${profile.values[0]} và ${profile.values[1]}`;
      return {
        ...common,
        promptVi: `Quan sát rồi chọn cảnh phù hợp với bài: ${level.learningObjectiveVi}.`,
        scenes: [{ id: `${level.id}-correct`, label: correctLabel, evidence: `${profile.values[0]} · ${profile.values[1]}`, correct: true }, { id: `${level.id}-missing`, label: "Cảnh còn thiếu một dấu hiệu", evidence: "Thiếu một phần", correct: false }, { id: `${level.id}-wrong`, label: "Cảnh có dấu hiệu ngược", evidence: "Không khớp mục tiêu", correct: false }],
        hintLadder: ["Đọc yêu cầu trước.", "So sánh từng dấu hiệu trong ba cảnh.", "Chọn cảnh có đủ bằng chứng, không chọn theo đoán."],
      };
    }
    case "lab":
    case "data":
      return {
        ...common,
        promptVi: `Đọc dấu hiệu rồi chọn kết luận cho bài: ${level.learningObjectiveVi}.`,
        chart: [32, 58, 44, 76],
        chartLabels: profile.values.slice(0, 4),
        options: [{ id: `${level.id}-evidence`, label: "Kết luận có bằng chứng", detail: `Dựa trên ${profile.values[0]}`, correct: true }, { id: `${level.id}-guess`, label: "Đoán ngay", detail: "Chưa nhìn dữ kiện", correct: false }],
        hintLadder: ["Nhìn dữ kiện trước.", `Tìm dấu hiệu liên quan đến ${profile.values[0]}.`, "Chọn kết luận có thể giải thích bằng dữ kiện."],
      };
    default:
      return null;
  }
}

function generatedContent(level) {
  const seed = levelSeed(level);
  if (level?.grade === 1 && level?.type === "standard") {
    const guide = MECHANIC_GUIDES[level?.mechanicId] ?? MECHANIC_GUIDES.observation;
    const shared = {
      guideTitleVi: guide.titleVi,
      steps: guide.steps,
      ruleVi: guide.ruleVi,
      objectiveVi: level?.learningObjectiveVi ?? guide.titleVi,
      reviewStatusVi: level?.curriculum?.approved ? "Nội dung đã được duyệt" : "Nội dung prototype cần review",
    };
    return grade1GeneratedContent(level, seed, shared) ?? { ...shared, ...DEFAULT_CONTENT };
  }
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
    boardLabelVi: content.boardLabelVi ?? level?.titleVi ?? guide.titleVi,
    reviewStatusVi: level?.curriculum?.approved ? "Nội dung đã được duyệt" : "Nội dung prototype cần review",
  });
}

export function getRuntimeContent(level) {
  const specific = G1_CONTENT[level?.id] ?? {};
  return withGuide(level, { ...generatedContent(level), ...specific });
}

function choiceValue(choice) {
  return typeof choice === "object" ? choice?.id : choice;
}

function includesChoice(choices, expected) {
  return Array.isArray(choices) && choices.some((choice) => choiceValue(choice) === expected);
}

export function validateRuntimeContent(level, content = getRuntimeContent(level)) {
  const errors = [];
  const add = (message) => errors.push(`${level?.id ?? "level"}: ${message}`);
  if (!content?.promptVi) add("missing promptVi");
  if (!Array.isArray(content?.steps) || content.steps.length < 3) add("missing three-step guide");
  if (!content?.ruleVi) add("missing ruleVi");

  switch (level?.mechanicId) {
    case "collect": {
      const correctCount = Array.isArray(content.items) ? content.items.filter((item) => item.correct).length : 0;
      if (!Number.isInteger(content.target) || content.target < 1 || correctCount < content.target) add("target is not reachable from collect items");
      break;
    }
    case "slot-fill":
      if (!Array.isArray(content.slots) || content.slots.length === 0) add("slot-fill needs slots");
      for (const slot of content.slots ?? []) if (!includesChoice(content.choices, slot.expected)) add(`slot ${slot.id} has no choice for expected value`);
      break;
    case "sort":
      if (!Array.isArray(content.items) || !content.items.length || !Array.isArray(content.buckets) || !content.buckets.length) add("sort needs items and buckets");
      for (const item of content.items ?? []) if (!content.buckets.some((bucket) => bucket.id === item.bucket)) add(`sort item ${item.id} points to an unknown bucket`);
      break;
    case "path":
      if (!Array.isArray(content.sequence) || content.sequence.length < 2) add("path needs a sequence");
      for (const value of content.sequence ?? []) if (!includesChoice(content.choices, value)) add(`path value ${value} is not selectable`);
      break;
    case "build-repair":
      if (!Number.isInteger(content.target) || content.target < 1) add("build-repair needs a positive target");
      if (Array.isArray(content.slotChoices)) {
        for (const expected of content.slotChoices) {
          if (!includesChoice(content.choices, expected)) add(`build slot ${expected} has no matching choice`);
        }
      } else if (!includesChoice(content.choices, "firefly-1") && !includesChoice(content.choices, "piece-1")) {
        add("legacy build content has no first piece");
      }
      break;
    case "simulation":
    case "resource-balance":
      if (!Array.isArray(content.splits) || !content.splits.some((option) => option.id === content.correct || option.correct === true)) add("simulation needs one reachable correct option");
      break;
    case "match":
      if (!Array.isArray(content.pairs) || content.pairs.length === 0) add("match needs pairs");
      if ((content.pairs ?? []).every((pair) => pair.correct === false)) add("match has no correct pair");
      break;
    case "sequence":
      if (content.variant === "subtract") {
        if (!Number.isFinite(content.start) || !Number.isFinite(content.target) || !includesChoice(content.choices, content.correct)) add("subtract needs a reachable numeric answer");
      } else if (content.variant === "missing-sequence") {
        const expected = content.sequence?.[content.missingIndex];
        if (!Array.isArray(content.sequence) || expected === undefined || !includesChoice(content.choices, expected)) add("missing-sequence answer is not reachable");
      } else {
        if (!Array.isArray(content.sequence) || content.sequence.length < 2) add("sequence needs at least two values");
        for (const value of content.sequence ?? []) if (!includesChoice(content.choices, value)) add(`sequence value ${value} is not selectable`);
      }
      break;
    case "observation":
      if (!Array.isArray(content.scenes) || content.scenes.filter((scene) => scene.correct).length !== 1) add("observation needs exactly one correct scene");
      break;
    case "lab":
    case "data":
      if (!Array.isArray(content.options) || content.options.filter((option) => option.correct).length !== 1) add("data/lab needs exactly one correct option");
      break;
    default:
      break;
  }
  return { valid: errors.length === 0, errors };
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

export { G1_CHAPTER_PROFILES, G1_CONTENT, MECHANIC_GUIDES, generatedContent };
