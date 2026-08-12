// Lumora local telemetry — in-memory event log separating learning outcomes
// from gameplay outcomes (per project rule: instrument both separately).
// No personal data is collected by default; callers must pass explicit payloads.

/** Event taxonomy: allowed names per kind. Learning = outcomes for the child's
 *  understanding; gameplay = session/level flow. A name lives in exactly one set. */
export const TELEMETRY_TAXONOMY = Object.freeze({
  learning: [
    "hint-requested",
    "hint-viewed",
    "attempt",
    "support-used",
    "error-revealed",
    "level-solved",
    "phase-solved",
    "mastery-reached",
  ],
  gameplay: [
    "session-start",
    "session-end",
    "level-start",
    "level-complete",
    "node-unlocked",
    "boss-defeated",
    "boss-phase-complete",
    "replay",
    "practice-session-start",
    "practice-challenge-complete",
    "practice-puzzle-start",
    "practice-puzzle-complete",
    "practice-discovery-start",
    "practice-discovery-complete",
    "practice-session-complete",
    "city-building-viewed",
    "cosmetic-equipped",
    "league-viewed",
    "world-preview-viewed",
    "quest-start",
    "quest-complete",
    "quest-discovered",
    "first-session-oracle-continue",
    "mechanic-intro-viewed",
    "mechanic-intro-started",
    "mechanic-intro-skipped",
    "boss-tease-viewed",
    "boss-tease-dismissed",
  ],
});

/** Provider descriptor: local, in-memory only. Remote analytics is a later integration. */
export const LOCAL_TELEMETRY_PROVIDER = Object.freeze({
  id: "local-telemetry",
  kind: "telemetry",
  name: "Local in-memory telemetry",
  local: true,
  offline: true,
  remote: false,
  syncsToCloud: false,
  provider: "memory",
  note: "In-memory local telemetry. Remote analytics is a later integration, not simulated.",
});

const clone = (value) => (value === undefined ? {} : structuredClone(value));

/** @param {object} [opts] @param {()=>number|string} [opts.clock] event timestamp source
 *  @param {number} [opts.maxEvents] queue cap, oldest dropped first (default 200) */
export function createLocalTelemetry({ clock = Date.now, maxEvents = 200 } = {}) {
  const cap = Math.max(1, Math.trunc(maxEvents) || 1);
  const namesByKind = {
    learning: new Set(TELEMETRY_TAXONOMY.learning),
    gameplay: new Set(TELEMETRY_TAXONOMY.gameplay),
  };
  let events = [];

  /** @returns {boolean} true if recorded; false if name is invalid or out of taxonomy. */
  function track(kind, name, payload) {
    if (!namesByKind[kind].has(name)) return false;
    events.push({ kind, name, at: clock(), payload: clone(payload) });
    if (events.length > cap) events.shift();
    return true;
  }

  return Object.freeze({
    descriptor: LOCAL_TELEMETRY_PROVIDER,
    /** Record a learning outcome. @returns {boolean} recorded? */
    trackLearning: (name, payload) => track("learning", name, payload),
    /** Record a gameplay outcome. @returns {boolean} recorded? */
    trackGameplay: (name, payload) => track("gameplay", name, payload),
    /** @returns {Array} snapshot of recorded events (cloned) */
    getEvents: () => events.map(clone),
    clear: () => {
      events = [];
    },
  });
}
