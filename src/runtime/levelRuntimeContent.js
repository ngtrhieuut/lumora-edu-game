// Runtime content is intentionally separate from the curriculum catalog.
// Catalog rows describe learning intent; this layer supplies bounded playable
// objects for the first ten reviewable levels without putting React in the data.

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

const DEFAULT_CONTENT = Object.freeze({
  items: Object.freeze([{ id: "a", label: "Mảnh sáng A", correct: true }, { id: "b", label: "Mảnh sáng B", correct: false }]),
  choices: Object.freeze([1, 2, 3]),
  hintLadder: ["Quan sát các vật thể trong cảnh.", "Hãy thử thao tác đang được Nubi làm sáng.", "Chọn mảnh phù hợp nhất với mục tiêu."],
});

const BOSS_PHASE_CONTENT = Object.freeze({
  sequence: Object.freeze({ sequence: Object.freeze([1, 2, 3]), choices: Object.freeze([2, 1, 3]), hintLadder: Object.freeze(["Nhìn các bậc đã sáng.", "Mỗi bậc tăng một số.", "Sau 1 là 2; sau 2 là 3."]) }),
  match: Object.freeze({ pairs: Object.freeze([{ id: "phase-merge-1", left: 2, right: 3, total: 5 }, { id: "phase-merge-2", left: 1, right: 4, total: 5 }]), hintLadder: Object.freeze(["Hai nhóm cùng đi về một Lõi.", "Gộp rồi đếm tổng.", "Mỗi dòng đang tạo ra năm hạt sáng."]) }),
  observation: Object.freeze({ scenes: Object.freeze([{ id: "phase-ready", label: "Cảnh đủ đồ", seats: 3, cups: 3, fruit: 3, correct: true }, { id: "phase-missing", label: "Cảnh còn thiếu", seats: 3, cups: 2, fruit: 3, correct: false }]), hintLadder: Object.freeze(["Mỗi bạn cần một ghế, một ly và một quả.", "Đếm từng nhóm.", "Chọn cảnh có ba nhóm bằng nhau."]) }),
});

export function getRuntimeContent(level) {
  const specific = G1_CONTENT[level?.id] ?? {};
  return Object.freeze({ ...DEFAULT_CONTENT, ...specific, levelId: level?.id ?? null, mechanicId: level?.mechanicId ?? null });
}

export function getBossPhaseContent(phase, level) {
  const familyContent = BOSS_PHASE_CONTENT[phase?.mechanicId] ?? null;
  const content = familyContent
    ? { ...DEFAULT_CONTENT, ...familyContent }
    : getRuntimeContent({ ...level, id: phase?.sourceLevelId ?? level?.id, mechanicId: phase?.mechanicId });
  return Object.freeze({ ...content, phaseId: phase?.id ?? null, phaseLabel: phase?.labelVi ?? "Mạch hồi sinh" });
}

export { G1_CONTENT };
