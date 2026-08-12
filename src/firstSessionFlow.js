// Pure, immutable, fail-closed state machine for the first-session flow.
// No React, browser APIs, storage, timers, or external dependencies.

export const FIRST_SESSION_PHASES = Object.freeze({
  idle: "idle",
  oracleIntro: "oracle-intro",
  numeral: "numeral",
  level1: "level-1",
  map: "map",
});

const VALID_PHASES = new Set(Object.values(FIRST_SESSION_PHASES));

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function makeState(phase, completed = false) {
  return Object.freeze({
    phase,
    completed: phase === FIRST_SESSION_PHASES.map && completed === true,
  });
}

function normalizeState(value) {
  try {
    const input = isRecord(value) ? value : {};
    const phase = VALID_PHASES.has(input.phase) ? input.phase : FIRST_SESSION_PHASES.idle;
    return makeState(phase, input.completed);
  } catch {
    return makeState(FIRST_SESSION_PHASES.idle);
  }
}

/** Create a fresh, canonical first-session flow state. Invalid input fails closed. */
export function createFirstSessionFlow(value = {}) {
  return normalizeState(value);
}

/** Begin the first-session flow through the canonical start event. */
export function beginFirstSessionFlow(state = createFirstSessionFlow()) {
  return transitionFirstSessionFlow(state, { type: "start" });
}

/**
 * Apply one supported event without mutating the caller's state or event.
 * Malformed and unknown events are immutable no-ops after state normalization.
 */
export function transitionFirstSessionFlow(state, event) {
  const current = normalizeState(state);

  try {
    if (!isRecord(event) || typeof event.type !== "string") return current;

    switch (event.type) {
      case "start":
        return current.phase === FIRST_SESSION_PHASES.idle
          ? makeState(FIRST_SESSION_PHASES.oracleIntro)
          : current;
      case "oracle-continue":
      case "oracle-skip":
        return current.phase === FIRST_SESSION_PHASES.oracleIntro
          ? makeState(FIRST_SESSION_PHASES.numeral)
          : current;
      case "numeral-complete":
      case "numeral-skip":
        return current.phase === FIRST_SESSION_PHASES.numeral
          ? makeState(FIRST_SESSION_PHASES.level1)
          : current;
      case "level-start":
        return current;
      case "level-complete":
        return current.phase === FIRST_SESSION_PHASES.level1
          ? makeState(FIRST_SESSION_PHASES.map, true)
          : current;
      case "exit":
        return current.phase === FIRST_SESSION_PHASES.map
          ? current
          : makeState(FIRST_SESSION_PHASES.map);
      case "reset":
        return makeState(FIRST_SESSION_PHASES.idle);
      default:
        return current;
    }
  } catch {
    return current;
  }
}
