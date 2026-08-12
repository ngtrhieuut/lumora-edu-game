// Pure, immutable, fail-closed visual signal state for Nubi.
// The state intentionally contains only canonical visual data: no PII or free text.

export const NUBI_SIGNAL_STATES = Object.freeze({
  ambient: "ambient",
  attention: "attention",
  responding: "responding",
  resonant: "resonant",
  recovering: "recovering",
});

const VALID_STATES = new Set(Object.values(NUBI_SIGNAL_STATES));
const HAS_OWN = Object.prototype.hasOwnProperty;
const MAX_INTENSITY = 3;

const DEFAULT_INTENSITY = Object.freeze({
  [NUBI_SIGNAL_STATES.ambient]: 0,
  [NUBI_SIGNAL_STATES.attention]: 1,
  [NUBI_SIGNAL_STATES.responding]: 2,
  [NUBI_SIGNAL_STATES.resonant]: 3,
  [NUBI_SIGNAL_STATES.recovering]: 1,
});

// Events are commands, not payload containers. Only their canonical type is read.
const EVENT_TARGETS = Object.freeze({
  "level-open": NUBI_SIGNAL_STATES.ambient,
  reset: NUBI_SIGNAL_STATES.ambient,
  "player-action": NUBI_SIGNAL_STATES.responding,
  "soft-fail": NUBI_SIGNAL_STATES.attention,
  "hint-requested": NUBI_SIGNAL_STATES.responding,
  "phase-complete": NUBI_SIGNAL_STATES.resonant,
  "level-success": NUBI_SIGNAL_STATES.resonant,
  recovery: NUBI_SIGNAL_STATES.recovering,
  cooldown: NUBI_SIGNAL_STATES.ambient,
});

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function clampIntensity(value, fallback = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(MAX_INTENSITY, Math.max(0, Math.trunc(value)));
}

function makeState(state, intensity = DEFAULT_INTENSITY[state]) {
  return Object.freeze({ state, intensity: clampIntensity(intensity, DEFAULT_INTENSITY[state]) });
}

function normalizeState(value) {
  const input = isRecord(value) ? value : {};
  const state = VALID_STATES.has(input.state) ? input.state : NUBI_SIGNAL_STATES.ambient;
  const fallback = DEFAULT_INTENSITY[state];
  const intensity = HAS_OWN.call(input, "intensity") ? clampIntensity(input.intensity, fallback) : fallback;
  return makeState(state, intensity);
}

/** Create a canonical, frozen Nubi visual signal state. */
export function createNubiSignalState(value = {}) {
  return normalizeState(value);
}

/**
 * Apply one allowlisted gameplay event. Unknown or malformed events are
 * immutable no-ops after state normalization; unrelated event fields are
 * intentionally ignored.
 */
export function transitionNubiSignal(state, event) {
  const current = normalizeState(state);
  if (!isRecord(event) || typeof event.type !== "string") return current;

  if (!HAS_OWN.call(EVENT_TARGETS, event.type)) return current;
  return makeState(EVENT_TARGETS[event.type]);
}

/** Return only bounded, CSS-safe visual fields for the current signal state. */
export function getNubiSignal(state) {
  const current = normalizeState(state);
  const { ambient, attention, responding, resonant } = NUBI_SIGNAL_STATES;

  return Object.freeze({
    state: current.state,
    intensity: current.intensity,
    visibleCore: current.state !== ambient,
    // Attention uses a softer beam to call focus; action/hint adds a burst.
    // Keep this contract aligned with the CSS selectors in styles.css.
    visibleBeam: current.state === attention || current.state === responding || current.state === resonant,
    showBurst: current.state === responding || current.state === resonant,
    animationKey: `nubi-signal-${current.state}`,
    dataState: current.state,
  });
}
