// Pure, fail-closed state machine for Nubi's gameplay mood.
// No React, browser APIs, storage, timers, or external dependencies.

export const MOODS = Object.freeze({
  idle: "idle",
  curious: "curious",
  hint: "hint",
  softFail: "soft-fail",
  phaseComplete: "phase-complete",
  resonant: "resonant",
});

const VALID_MOODS = new Set(Object.values(MOODS));

const TRANSITIONS = Object.freeze({
  [MOODS.idle]: Object.freeze({
    start: MOODS.curious,
    "level-success": MOODS.resonant,
    reset: MOODS.idle,
  }),
  [MOODS.curious]: Object.freeze({
    hint: MOODS.hint,
    "soft-fail": MOODS.softFail,
    "phase-complete": MOODS.phaseComplete,
    "level-success": MOODS.resonant,
    reset: MOODS.idle,
  }),
  [MOODS.hint]: Object.freeze({
    hint: MOODS.hint,
    retry: MOODS.curious,
    "soft-fail": MOODS.softFail,
    "phase-complete": MOODS.phaseComplete,
    "level-success": MOODS.resonant,
    reset: MOODS.idle,
  }),
  [MOODS.softFail]: Object.freeze({
    hint: MOODS.hint,
    retry: MOODS.curious,
    "soft-fail": MOODS.softFail,
    "phase-complete": MOODS.phaseComplete,
    "level-success": MOODS.resonant,
    reset: MOODS.idle,
  }),
  [MOODS.phaseComplete]: Object.freeze({
    "next-phase": MOODS.curious,
    "level-success": MOODS.resonant,
    reset: MOODS.idle,
  }),
  [MOODS.resonant]: Object.freeze({
    reset: MOODS.idle,
  }),
});

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function makeState(mood) {
  return Object.freeze({ mood });
}

function normalizeNubiFeedbackState(value) {
  return makeState(isRecord(value) && VALID_MOODS.has(value.mood) ? value.mood : MOODS.idle);
}

/** Create a fresh Nubi feedback state in the safe initial mood. */
export function createNubiFeedbackState() {
  return makeState(MOODS.idle);
}

/**
 * Apply one canonical event. Unknown or malformed events are no-ops after
 * state normalization, so callers can never advance an unsafe mood by accident.
 * Supported event types: start, hint, soft-fail, phase-complete, next-phase,
 * level-success, retry, and reset.
 */
export function transitionNubiFeedback(state, event) {
  const current = normalizeNubiFeedbackState(state);
  if (!isRecord(event) || typeof event.type !== "string") return current;

  const nextMood = TRANSITIONS[current.mood]?.[event.type];
  return makeState(nextMood ?? current.mood);
}

/** Return the normalized mood without exposing malformed state data. */
export function getNubiMood(state) {
  return normalizeNubiFeedbackState(state).mood;
}
