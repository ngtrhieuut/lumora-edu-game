import { getLevelById } from "../levelCatalog/index.js";
import { getMechanicDefinition } from "../levelCatalog/mechanicRegistry.js";
import { getBossPhaseContent, getRuntimeContent } from "./levelRuntimeContent.js";
import { getRendererForMechanic } from "./levelRuntimeRegistry.js";

const CHAPTER_BOSS_PHASE_MECHANICS = Object.freeze(["collect", "sequence", "match", "observation"]);
const GRAND_BOSS_PHASE_MECHANICS = Object.freeze(["collect", "slot-fill", "build-repair", "simulation", "observation", "data"]);
const PHASE_LABEL_BY_MECHANIC = Object.freeze({
  collect: "Đếm vật đúng",
  "slot-fill": "Điền vào ô",
  sort: "So sánh nhóm",
  path: "Nối theo thứ tự",
  "build-repair": "Sửa cấu trúc",
  simulation: "Giữ cân bằng",
  match: "Gộp nhóm",
  sequence: "Tìm bước tiếp",
  observation: "Quan sát bằng chứng",
  "resource-balance": "Phân bổ nguồn",
  lab: "Thử nghiệm an toàn",
  data: "Đọc dữ liệu",
});

function pickReviewLevelIds(level) {
  const reviewLevelIds = Array.isArray(level?.boss?.reviewLevelIds)
    ? level.boss.reviewLevelIds.filter((levelId) => getLevelById(levelId))
    : [];
  const phaseCount = Number.isInteger(level?.boss?.phaseCount) ? level.boss.phaseCount : 0;
  if (reviewLevelIds.length <= phaseCount) return reviewLevelIds;
  if (phaseCount <= 1) return reviewLevelIds.slice(0, 1);

  // Keep the first, middle and final learned mechanics in a boss. This makes
  // the boss a transfer check over the chapter data instead of a hard-coded
  // mini-game unrelated to the catalog row it represents.
  const selected = [];
  for (let index = 0; index < phaseCount; index += 1) {
    const sourceIndex = Math.round((index * (reviewLevelIds.length - 1)) / (phaseCount - 1));
    const sourceLevelId = reviewLevelIds[sourceIndex];
    if (sourceLevelId && !selected.includes(sourceLevelId)) selected.push(sourceLevelId);
  }
  return selected;
}

function getBossPhaseMechanics(level) {
  const expected = level?.type === "grand-boss" ? GRAND_BOSS_PHASE_MECHANICS : CHAPTER_BOSS_PHASE_MECHANICS;
  const count = Number.isInteger(level?.boss?.phaseCount) ? level.boss.phaseCount : expected.length;
  const reviewLevelIds = pickReviewLevelIds(level);
  return Array.from({ length: count }, (_, index) => {
    const sourceLevel = getLevelById(reviewLevelIds[index]);
    return sourceLevel?.mechanicId ?? expected[index] ?? "observation";
  });
}

export function resolveLevelRuntime(level) {
  if (!level || typeof level !== "object" || typeof level.id !== "string" || !level.id.trim()) {
    return { ok: false, errors: ["A catalog level with a stable id is required."] };
  }
  const mechanic = getMechanicDefinition(level.mechanicId);
  if (!mechanic) return { ok: false, errors: [`${level.id}: unknown mechanic ${level.mechanicId}`] };
  const renderer = getRendererForMechanic(level.mechanicId);
  if (!renderer.supported) return { ok: false, errors: [`${level.id}: renderer unavailable for ${level.mechanicId}`] };
  const isBoss = level.type === "chapter-boss" || level.type === "grand-boss";
  const phaseMechanics = isBoss ? getBossPhaseMechanics(level) : [];
  const reviewLevelIds = pickReviewLevelIds(level);
  const phases = phaseMechanics.map((mechanicId, index) => Object.freeze({
    id: `${level.id}:phase-${index + 1}`,
    index,
    mechanicId,
    rendererId: getRendererForMechanic(mechanicId).rendererId,
    sourceLevelId: reviewLevelIds[index] ?? null,
    labelVi: PHASE_LABEL_BY_MECHANIC[mechanicId] ?? `Mạch ${index + 1}`,
  }));
  return {
    ok: true,
    level,
    mechanicId: level.mechanicId,
    rendererId: renderer.rendererId,
    renderer,
    content: getRuntimeContent(level),
    phaseIds: phases.map((phase) => phase.id),
    phases,
    boss: isBoss ? Object.freeze({
      ...level.boss,
      phaseMechanics: phases.map((phase) => phase.mechanicId),
      phases,
    }) : null,
    design: mechanic,
  };
}

export function getRuntimePhaseContent(phase, level) {
  return getBossPhaseContent(phase, level);
}

export { CHAPTER_BOSS_PHASE_MECHANICS, GRAND_BOSS_PHASE_MECHANICS };
