// Pure state machine for the pairwise comparison prototype.
// It is intentionally separate from the canonical campaign until the
// comparison learning objective has official curriculum evidence.

const DEFAULT_ROUNDS = Object.freeze([
  Object.freeze({ id: "round-1", left: "small", right: "large", target: "larger" }),
  Object.freeze({ id: "round-2", left: "large", right: "small", target: "smaller" }),
  Object.freeze({ id: "round-3", left: "small", right: "large", target: "larger" }),
]);

const VALID_SIZES = new Set(["small", "large"]);
const VALID_TARGETS = new Set(["larger", "smaller"]);

function normalizeText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
function normalizeRounds(value) {
  if (!Array.isArray(value)) return DEFAULT_ROUNDS.map((round) => ({ ...round }));
  const rounds = value.map((round, index) => {
    const id = normalizeText(round?.id) ?? `round-${index + 1}`;
    const left = round?.left;
    const right = round?.right;
    const target = round?.target;
    if (!VALID_SIZES.has(left) || !VALID_SIZES.has(right) || left === right || !VALID_TARGETS.has(target)) return null;
    return { id, left, right, target };
  }).filter(Boolean);
  return rounds.length > 0 ? rounds : DEFAULT_ROUNDS.map((round) => ({ ...round }));
}

function normalizeRoundIndex(value, total) {
  if (!Number.isInteger(value)) return 0;
  return Math.min(total, Math.max(0, value));
}

function normalizeAnswers(value, rounds, roundIndex) {
  if (!Array.isArray(value)) return [];
  const validRoundIds = new Set(rounds.slice(0, roundIndex).map((round) => round.id));
  const answers = [];
  for (const answer of value) {
    const roundId = normalizeText(answer?.roundId);
    const objectId = answer?.objectId === "left" || answer?.objectId === "right" ? answer.objectId : null;
    const zoneId = VALID_TARGETS.has(answer?.zoneId) ? answer.zoneId : null;
    if (!roundId || !validRoundIds.has(roundId) || !objectId || !zoneId) continue;
    if (answers.some((entry) => entry.roundId === roundId)) continue;
    answers.push({ roundId, objectId, zoneId });
  }
  return answers;
}

export function createComparePairState(options = {}) {
  const rounds = normalizeRounds(options?.rounds);
  return {
    rounds,
    roundIndex: 0,
    selectedObjectId: null,
    answers: [],
    mistakes: 0,
    complete: rounds.length === 0,
  };
}

export function normalizeComparePairState(value, options = {}) {
  const base = createComparePairState({ rounds: value?.rounds ?? options?.rounds });
  const roundIndex = normalizeRoundIndex(value?.roundIndex, base.rounds.length);
  const answers = normalizeAnswers(value?.answers, base.rounds, roundIndex);
  const selectedObjectId = value?.selectedObjectId === "left" || value?.selectedObjectId === "right"
    ? value.selectedObjectId
    : null;
  const mistakes = Number.isInteger(value?.mistakes) && value.mistakes >= 0 ? value.mistakes : 0;
  return {
    ...base,
    roundIndex,
    selectedObjectId,
    answers,
    mistakes,
    complete: roundIndex >= base.rounds.length,
  };
}

export function getCurrentComparePair(state) {
  const normalized = normalizeComparePairState(state);
  return normalized.rounds[normalized.roundIndex] ?? null;
}

export function getComparePairObjectSize(state, objectId) {
  const pair = getCurrentComparePair(state);
  if (!pair || (objectId !== "left" && objectId !== "right")) return null;
  return pair[objectId] ?? null;
}

export function getExpectedComparePairObjectId(state, zoneId = getCurrentComparePair(state)?.target) {
  const pair = getCurrentComparePair(state);
  if (!pair || !VALID_TARGETS.has(zoneId)) return null;
  const expectedSize = zoneId === "larger" ? "large" : "small";
  if (pair.left === expectedSize) return "left";
  if (pair.right === expectedSize) return "right";
  return null;
}

export function getComparePairProgress(state) {
  const normalized = normalizeComparePairState(state);
  return {
    completed: normalized.roundIndex,
    total: normalized.rounds.length,
    mistakes: normalized.mistakes,
    complete: normalized.complete,
  };
}

export function answerComparePair(state, objectId, zoneId) {
  const normalized = normalizeComparePairState(state);
  const pair = getCurrentComparePair(normalized);
  if (normalized.complete) return { accepted: false, reason: "complete", state: normalized, complete: true };
  if (!pair || (objectId !== "left" && objectId !== "right")) {
    return { accepted: false, reason: "invalid-object", state: normalized, complete: false };
  }
  if (!VALID_TARGETS.has(zoneId)) {
    return { accepted: false, reason: "invalid-zone", state: normalized, complete: false };
  }
  const expectedObjectId = getExpectedComparePairObjectId(normalized, zoneId);
  if (zoneId !== pair.target || objectId !== expectedObjectId) {
    return {
      accepted: false,
      reason: "compare-mismatch",
      state: { ...normalized, selectedObjectId: objectId, mistakes: normalized.mistakes + 1 },
      complete: false,
    };
  }
  const nextRoundIndex = normalized.roundIndex + 1;
  const next = {
    ...normalized,
    roundIndex: nextRoundIndex,
    selectedObjectId: null,
    answers: [...normalized.answers, { roundId: pair.id, objectId, zoneId }],
    complete: nextRoundIndex >= normalized.rounds.length,
  };
  return { accepted: true, reason: "compared", state: next, complete: next.complete };
}
