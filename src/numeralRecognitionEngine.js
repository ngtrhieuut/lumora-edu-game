// Pure state machine for the first-level numeral recognition prototype.
// It stays outside the canonical campaign until the objective is officially reviewed.

const DEFAULT_ROUNDS = Object.freeze([
  Object.freeze({ id: "round-1", quantity: 3, target: 3, options: Object.freeze([2, 3, 4]) }),
  Object.freeze({ id: "round-2", quantity: 5, target: 5, options: Object.freeze([4, 5, 6]) }),
  Object.freeze({ id: "round-3", quantity: 7, target: 7, options: Object.freeze([6, 7, 8]) }),
]);

const VALID_ZONE = "core";

function normalizeInteger(value) {
  return Number.isInteger(value) && value >= 0 && value <= 10 ? value : null;
}
function normalizeRounds(value) {
  if (!Array.isArray(value)) return DEFAULT_ROUNDS.map((round) => ({ ...round, options: [...round.options] }));
  const rounds = value.map((round, index) => {
    const id = typeof round?.id === "string" && round.id.trim() ? round.id.trim() : `round-${index + 1}`;
    const quantity = normalizeInteger(round?.quantity);
    const target = normalizeInteger(round?.target);
    const options = Array.isArray(round?.options)
      ? [...new Set(round.options.map(normalizeInteger).filter((option) => option !== null))]
      : [];
    if (quantity === null || target === null || quantity !== target || options.length < 2 || !options.includes(target)) return null;
    return { id, quantity, target, options };
  }).filter(Boolean);
  return rounds.length > 0 ? rounds : DEFAULT_ROUNDS.map((round) => ({ ...round, options: [...round.options] }));
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
    const roundId = typeof answer?.roundId === "string" ? answer.roundId : null;
    const numeral = normalizeInteger(answer?.numeral);
    if (!roundId || !validRoundIds.has(roundId) || numeral === null || answers.some((entry) => entry.roundId === roundId)) continue;
    answers.push({ roundId, numeral });
  }
  return answers;
}

export function createNumeralRecognitionState(options = {}) {
  const rounds = normalizeRounds(options?.rounds);
  return {
    rounds,
    roundIndex: 0,
    selectedNumeral: null,
    answers: [],
    mistakes: 0,
    complete: rounds.length === 0,
  };
}

export function normalizeNumeralRecognitionState(value, options = {}) {
  const base = createNumeralRecognitionState({ rounds: value?.rounds ?? options?.rounds });
  const roundIndex = normalizeRoundIndex(value?.roundIndex, base.rounds.length);
  const selectedNumeral = normalizeInteger(value?.selectedNumeral);
  const mistakes = Number.isInteger(value?.mistakes) && value.mistakes >= 0 ? value.mistakes : 0;
  return {
    ...base,
    roundIndex,
    selectedNumeral,
    answers: normalizeAnswers(value?.answers, base.rounds, roundIndex),
    mistakes,
    complete: roundIndex >= base.rounds.length,
  };
}

export function getCurrentNumeralRound(state) {
  const normalized = normalizeNumeralRecognitionState(state);
  return normalized.rounds[normalized.roundIndex] ?? null;
}

export function getNumeralProgress(state) {
  const normalized = normalizeNumeralRecognitionState(state);
  return {
    completed: normalized.roundIndex,
    total: normalized.rounds.length,
    mistakes: normalized.mistakes,
    complete: normalized.complete,
  };
}

export function chooseNumeral(state, numeral, zoneId = VALID_ZONE) {
  const normalized = normalizeNumeralRecognitionState(state);
  const round = getCurrentNumeralRound(normalized);
  const safeNumeral = normalizeInteger(numeral);
  if (normalized.complete) return { accepted: false, reason: "complete", state: normalized, complete: true };
  if (!round || safeNumeral === null || !round.options.includes(safeNumeral)) {
    return { accepted: false, reason: "invalid-numeral", state: normalized, complete: false };
  }
  if (zoneId !== VALID_ZONE || safeNumeral !== round.target) {
    return {
      accepted: false,
      reason: "wrong-numeral",
      state: { ...normalized, selectedNumeral: safeNumeral, mistakes: normalized.mistakes + 1 },
      complete: false,
    };
  }
  const nextRoundIndex = normalized.roundIndex + 1;
  const next = {
    ...normalized,
    roundIndex: nextRoundIndex,
    selectedNumeral: null,
    answers: [...normalized.answers, { roundId: round.id, numeral: safeNumeral }],
    complete: nextRoundIndex >= normalized.rounds.length,
  };
  return { accepted: true, reason: "recognized", state: next, complete: next.complete };
}
