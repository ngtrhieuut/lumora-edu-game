import { getMechanicDefinition } from "../levelCatalog/mechanicRegistry.js";
import { getBossPhaseContent, getRuntimeContent } from "./levelRuntimeContent.js";
import { getRendererForMechanic } from "./levelRuntimeRegistry.js";

const CHAPTER_BOSS_PHASE_MECHANICS = Object.freeze(["collect", "sequence", "match", "observation"]);
const GRAND_BOSS_PHASE_MECHANICS = Object.freeze(["collect", "slot-fill", "build-repair", "simulation", "observation", "data"]);

function getBossPhaseMechanics(level) {
  const expected = level?.type === "grand-boss" ? GRAND_BOSS_PHASE_MECHANICS : CHAPTER_BOSS_PHASE_MECHANICS;
  const count = Number.isInteger(level?.boss?.phaseCount) ? level.boss.phaseCount : expected.length;
  return Array.from({ length: count }, (_, index) => expected[index] ?? "observation");
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
  const reviewLevelIds = Array.isArray(level.boss?.reviewLevelIds) ? level.boss.reviewLevelIds : [];
  const phases = phaseMechanics.map((mechanicId, index) => Object.freeze({
    id: `${level.id}:phase-${index + 1}`,
    index,
    mechanicId,
    rendererId: getRendererForMechanic(mechanicId).rendererId,
    sourceLevelId: reviewLevelIds[index] ?? null,
    labelVi: ["Đếm", "Thứ tự", "Gộp và nối", "Tình huống đời sống", "Chuyển giao", "Tổng hợp"][index] ?? `Mạch ${index + 1}`,
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
