// Data-driven 3-phase definition for multi-stage nodes (mixed/challenge/boss).
// Pure helpers only — no React, no storage, no imports from other game modules.
// Mechanics are the only allowed phase mechanics; sourceNodeId must be a node that
// the player already met before the owning node, so a stage only reuses taught skills.

export const MECHANICS = [
  "collect",
  "match",
  "add",
  "path",
  "subtract",
  "compare",
  "shape",
  "pattern",
];

const phase = (id, label, mechanic, sourceNodeId, target, telemetryEvent) => ({
  id,
  label,
  mechanic,
  sourceNodeId,
  target,
  telemetryEvent,
});

export const MULTI_STAGE_CONFIG = {
  mixed: [
    phase("collect", "Thu hạt sáng", "collect", "collect", { goal: 5, unit: "hạt" }, "phase:mixed:collect"),
    phase("add", "Nối nhịp cầu", "add", "bridge", { start: 4, add: 3 }, "phase:mixed:add"),
    phase("shape", "Ghép hình khối", "shape", "shape", { shapes: ["circle", "triangle", "square"], goal: 3 }, "phase:mixed:shape"),
  ],
  challenge: [
    phase("match", "Ghép số với lượng", "match", "match", { pairs: 3 }, "phase:challenge:match"),
    phase("path", "Nối đường dẫn quang", "path", "path", { start: 4, add: 2 }, "phase:challenge:path"),
    phase("compare", "So sánh từng cặp", "compare", "sort", { pairs: 3 }, "phase:challenge:compare"),
  ],
  boss: [
    phase("collect", "Gọi lại ánh sáng", "collect", "collect", { goal: 5, unit: "hạt" }, "phase:boss:collect"),
    phase("add", "Nối mạch phép cộng", "add", "bridge", { start: 4, add: 3 }, "phase:boss:add"),
    phase("pattern", "Mở khóa quy luật", "pattern", "rune", { steps: 4 }, "phase:boss:pattern"),
  ],
};

/** Return the 3-phase array for a mode (mixed | challenge | boss), or null if unknown. */
export function getMultiStageConfig(mode) {
  return MULTI_STAGE_CONFIG[mode] ?? null;
}

const signature = (config) =>
  config.map((p) => `${p?.mechanic ?? ""}:${p?.sourceNodeId ?? ""}`).join("|");

/**
 * Validate one mode's phase list. Returns an array of human-readable error strings;
 * an empty array means valid. Checks: exactly 3 phases, unique phase ids, known
 * mechanics, and source nodes present in orderedNodeIds.
 */
export function validateMultiStageConfig(config, orderedNodeIds) {
  const errors = [];
  if (!Array.isArray(orderedNodeIds)) return ["orderedNodeIds must be an array"];
  if (!Array.isArray(config)) return ["config must be an array of phases"];
  if (config.length !== 3) errors.push(`expected exactly 3 phases, got ${config.length}`);
  const seen = new Set();
  for (const p of config) {
    if (!p || typeof p !== "object") {
      errors.push("phase entries must be objects");
      continue;
    }
    if (!p.id || seen.has(p.id)) errors.push(`duplicate or missing phase id: ${p.id}`);
    seen.add(p.id);
    if (!MECHANICS.includes(p.mechanic)) errors.push(`unknown mechanic: ${p.mechanic}`);
    if (!orderedNodeIds.includes(p.sourceNodeId)) errors.push(`unknown source node: ${p.sourceNodeId}`);
  }
  return errors;
}

/**
 * Boss-specific checks on top of validateMultiStageConfig:
 * every boss phase must draw from a node taught BEFORE the boss (bossId), and the
 * boss phase sequence must not simply repeat the mixed or challenge sequence.
 */
export function validateBossPrerequisites(config, orderedNodeIds, bossId = "boss") {
  const errors = validateMultiStageConfig(config, orderedNodeIds);
  const bossIndex = orderedNodeIds.indexOf(bossId);
  if (bossIndex === -1) {
    errors.push(`boss node not found: ${bossId}`);
    return errors;
  }
  for (const p of config) {
    const idx = orderedNodeIds.indexOf(p?.sourceNodeId);
    if (idx !== -1 && idx >= bossIndex) {
      errors.push(`source node ${p.sourceNodeId} occurs at/after boss ${bossId}`);
    }
  }
  const seq = signature(config);
  for (const mode of ["mixed", "challenge"]) {
    if (seq === signature(MULTI_STAGE_CONFIG[mode])) {
      errors.push(`boss phase sequence duplicates ${mode}`);
    }
  }
  return errors;
}
