// Expands compact level blueprints into the stable 500-level runtime schema.
export const WORLD_BY_GRADE = Object.freeze({
  1: { id: "forest-awakening", nameVi: "Rừng Thức Tỉnh" },
  2: { id: "crystal-river", nameVi: "Dòng Sông Pha Lê" },
  3: { id: "mechanical-desert", nameVi: "Sa Mạc Cơ Giới" },
  4: { id: "sky-kingdom", nameVi: "Vương Quốc Trên Mây" },
  5: { id: "stellar-frontier", nameVi: "Biên Giới Tinh Tú" },
});
const SOURCE_COMMIT = "e98e736c81646e86c5bc01abbad2d22f8ca9dd92";

const MECHANIC_DESIGN = Object.freeze({
  collect: "Chạm/kéo đúng vật thể trực tiếp trong môi trường; số lượng và phản hồi nằm trong scene.",
  "slot-fill": "Kéo vật thể vào các slot còn thiếu; thế giới phản hồi ngay khi cấu trúc hoàn thiện.",
  sort: "Phân loại vật thể theo thuộc tính bằng các cổng/đích trực quan, không dùng bảng đáp án.",
  path: "Chọn hoặc xây tuyến đường dựa trên số lượng, quy luật hoặc bằng chứng trong môi trường.",
  "build-repair": "Dùng kiến thức để sửa hoặc xây cấu trúc; object chỉ khớp khi logic đúng.",
  simulation: "Điều chỉnh tài nguyên/tham số và quan sát hệ thống phản ứng; ưu tiên cause/effect.",
  match: "Nối cặp bằng hình, vị trí, chức năng hoặc quan hệ; giảm tối đa text.",
  sequence: "Sắp xếp số, bước, giai đoạn hoặc vòng đời theo trình tự có ý nghĩa.",
  observation: "Quan sát scene, phát hiện dấu hiệu và hành động dựa trên bằng chứng nhìn thấy/nghe thấy.",
  "resource-balance": "Phân bổ tài nguyên hữu hạn cho nhiều mục tiêu và giữ hệ thống cân bằng.",
  lab: "Dự đoán -> thao tác lab ảo an toàn -> quan sát -> kết luận; không hướng dẫn thí nghiệm nguy hiểm ngoài đời.",
  data: "Đọc bảng/biểu đồ trực quan để ra quyết định trong mission thay vì trả lời câu hỏi rời rạc.",
  boss: "Boss chữa lành nhiều phase, dùng lại mechanic đã học và có checkpoint + micro-practice.",
});

function subjectFor(grade, chapter) {
  if (grade === 1) return chapter <= 4 ? "Toán" : chapter <= 8 ? "Khoa học tự nhiên" : "Tích hợp";
  if (grade === 2) return chapter <= 5 || chapter === 9 ? "Toán" : chapter <= 8 ? "Khoa học tự nhiên" : "Tích hợp";
  if (grade === 3) return chapter <= 5 ? "Toán" : chapter <= 9 ? "Khoa học tự nhiên" : "Tích hợp";
  return chapter <= 4 ? "Toán" : chapter <= 9 ? "Khoa học" : "Tích hợp";
}

export function buildGradeLevels(grade, chapters, blueprints) {
  const world = WORLD_BY_GRADE[grade];
  if (!world) throw new RangeError(`Unsupported grade: ${grade}`);
  return Object.freeze(blueprints.map(([chapter, order, titleVi, skillGroupVi, mechanicId]) => {
    const chapterMeta = chapters[chapter];
    const position = ((order - 1) % 10) + 1;
    const isBoss = order % 10 === 0;
    const isGrand = order === 100;
    const id = `g${grade}-l${String(order).padStart(3, "0")}`;
    const tier = isBoss ? "boss" : position <= 3 ? "guided" : position <= 6 ? "supported" : "independent";
    const prerequisites = order > 1 ? [`g${grade}-l${String(order - 1).padStart(3, "0")}`] : grade > 1 ? [`g${grade - 1}-l100`] : [];
    const reviewLevelIds = isGrand ? Array.from({ length: 99 }, (_, i) => `g${grade}-l${String(i + 1).padStart(3, "0")}`) : isBoss ? Array.from({ length: 9 }, (_, i) => `g${grade}-l${String(order - 9 + i).padStart(3, "0")}`) : [];
    return Object.freeze({
      id, grade, worldId: world.id, worldNameVi: world.nameVi, chapter, chapterTitleVi: chapterMeta.titleVi, order, chapterPosition: position,
      type: isGrand ? "grand-boss" : isBoss ? "chapter-boss" : "standard", titleVi, fantasyVi: chapterMeta.fantasyVi, subject: subjectFor(grade, chapter),
      skillId: `LUMORA.G${grade}.C${String(chapter).padStart(2, "0")}.L${String(order).padStart(3, "0")}`, skillGroupVi, learningObjectiveVi: skillGroupVi,
      mechanicId, designBriefVi: MECHANIC_DESIGN[mechanicId],
      difficulty: Object.freeze({ tier, hintBudget: tier === "guided" ? 3 : tier === "supported" ? 2 : tier === "independent" ? 1 : 3, hasTimePressure: false, transferRequired: position >= 8 || isBoss, multiStep: position >= 4 || isBoss }),
      oracle: Object.freeze({ policy: "three-step-scaffold", neverSayWrong: true, guidedCompletionAfterRepeatedStruggle: true }),
      mastery: Object.freeze({ evidence: Object.freeze(["level-solved", "attempt-count", "hint-usage", "transfer"]), minimumMasteryToPass: 1 }),
      rewards: Object.freeze({ knowledgeEnergy: 12 + grade * 2 + (isBoss ? 4 : 0), knowledgeShards: isGrand ? 3 : isBoss ? 1 : 0, xp: 0 }),
      restoration: Object.freeze({ enabled: true, scope: isBoss ? "world-landmark" : "local-environment" }), prerequisites: Object.freeze(prerequisites),
      curriculum: Object.freeze({ approved: false, sourceBranch: "main", sourceCommit: SOURCE_COMMIT, sourceDoc: `docs/levels/grade-${grade}.md`, sourceLevel: order, status: "prototype-mapped-needs-human-review" }),
      ...(isBoss ? { boss: Object.freeze({ kind: isGrand ? "grand" : "chapter", reviewLevelIds: Object.freeze(reviewLevelIds), phaseCount: isGrand ? 6 : 4, checkpointPerPhase: true, microPracticeOnRepeatedStruggle: true, resetWholeBossOnFail: false, usesRecoveryMeter: true }) } : {}),
    });
  }));
}
