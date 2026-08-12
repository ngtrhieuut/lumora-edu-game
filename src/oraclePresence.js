// Pure, immutable, fail-closed state machine for the Oracle manifestation.
// No React, browser APIs, storage, timers, or external dependencies.

export const ORACLE_PRESENCE_STATES = Object.freeze({
  dormant: "dormant",
  materializing: "materializing",
  teaching: "teaching",
  guiding: "guiding",
  celebrating: "celebrating",
  dissolving: "dissolving",
});

const VALID_STATES = new Set(Object.values(ORACLE_PRESENCE_STATES));
const HAS_OWN = Object.prototype.hasOwnProperty;

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function clampHintLevel(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(3, Math.max(0, Math.trunc(value)));
}

function makeState(state, hintLevel) {
  return Object.freeze({ state, hintLevel });
}

function normalizeState(value) {
  const input = isRecord(value) ? value : {};
  const state = VALID_STATES.has(input.state) ? input.state : ORACLE_PRESENCE_STATES.dormant;
  const hintLevel = HAS_OWN.call(input, "hintLevel") ? clampHintLevel(input.hintLevel) : 0;
  return makeState(state, hintLevel);
}

function hasValidHintLevel(event) {
  return !HAS_OWN.call(event, "hintLevel")
    || (typeof event.hintLevel === "number" && Number.isFinite(event.hintLevel));
}

function getEventHintLevel(event, currentHintLevel, defaultLevel = currentHintLevel) {
  return HAS_OWN.call(event, "hintLevel")
    ? clampHintLevel(event.hintLevel)
    : defaultLevel;
}

function nextStateFor(currentState, eventType) {
  const {
    dormant,
    materializing,
    teaching,
    guiding,
    celebrating,
    dissolving,
  } = ORACLE_PRESENCE_STATES;

  switch (eventType) {
    case "level-open":
    case "reset":
      return dormant;
    case "hint-requested":
    case "auto-hint":
      if (currentState === dormant) return materializing;
      if (currentState === materializing) return teaching;
      if (currentState === teaching || currentState === guiding) return currentState;
      return currentState === dissolving ? materializing : currentState;
    case "soft-fail":
      // A wrong attempt should make Mạch present without jumping straight to
      // a full hint. The following auto-hint/request can then promote the
      // already-materialized presence to teaching.
      if (currentState === dormant) return materializing;
      return currentState === dissolving || currentState === celebrating
        ? materializing
        : currentState;
    case "guidance-started":
      return currentState === celebrating || currentState === dissolving ? currentState : guiding;
    case "level-success":
      return currentState === dissolving ? dissolving : celebrating;
    case "player-action":
      return currentState === materializing ? teaching : currentState;
    case "dismiss":
    case "dissolve":
      return currentState === dormant || currentState === dissolving ? currentState : dissolving;
    default:
      return currentState;
  }
}

/** Create a canonical Oracle presence state. Invalid input fails closed. */
export function createOraclePresenceState(value = {}) {
  return normalizeState(value);
}

/**
 * Apply one supported event without mutating the caller's state or event.
 * Unknown, malformed, and invalid-payload events are immutable no-ops.
 */
export function transitionOraclePresence(state, event) {
  const current = normalizeState(state);
  if (!isRecord(event) || typeof event.type !== "string" || !hasValidHintLevel(event)) return current;

  const nextState = nextStateFor(current.state, event.type);
  if (nextState === current.state && event.type !== "reset" && event.type !== "level-open") {
    if (event.type !== "hint-requested" && event.type !== "auto-hint") return current;
    if (current.state !== ORACLE_PRESENCE_STATES.dissolving) return makeState(current.state, getEventHintLevel(event, current.hintLevel));
  }

  if (event.type === "reset" || event.type === "level-open") return makeState(ORACLE_PRESENCE_STATES.dormant, 0);

  const isHintEvent = event.type === "hint-requested" || event.type === "auto-hint";
  const nextHintLevel = isHintEvent
    ? getEventHintLevel(event, current.hintLevel, Math.max(1, current.hintLevel))
    : getEventHintLevel(event, current.hintLevel);
  return makeState(nextState, nextHintLevel);
}

/** Return a frozen, CSS-ready snapshot with only canonical Oracle fields. */
export function getOraclePresence(state) {
  const current = normalizeState(state);
  const { dormant, materializing, teaching, guiding, celebrating } = ORACLE_PRESENCE_STATES;
  const intensity = current.state === dormant ? 0 : current.state === materializing || current.state === "dissolving" ? 1 : 2;

  return Object.freeze({
    state: current.state,
    hintLevel: current.hintLevel,
    intensity,
    visible: current.state !== dormant,
    teaching: current.state === teaching,
    guiding: current.state === guiding,
    celebration: current.state === celebrating,
    animationKey: `oracle-${current.state}`,
    dataState: current.state,
  });
}
