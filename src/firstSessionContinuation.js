// Pure, immutable, fail-closed continuation model for the first-session slice.
// This keeps the first Level 1 clear connected to the next mechanic without
// changing curriculum, reward, cloud, or child-profile state.

export const FIRST_SESSION_CONTINUATION_PHASES = Object.freeze({
  idle: "idle",
  map: "map",
  mechanicIntro: "mechanic-intro",
  level2: "level-2",
  bossTease: "boss-tease",
  complete: "complete",
});

const VALID_PHASES = new Set(Object.values(FIRST_SESSION_CONTINUATION_PHASES));
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function makeState(phase, flags = {}) {
  return Object.freeze({
    phase,
    level1Completed: flags.level1Completed === true,
    mechanicIntroSeen: flags.mechanicIntroSeen === true,
    level2Completed: flags.level2Completed === true,
    bossTeaseSeen: flags.bossTeaseSeen === true,
  });
}

function normalizeState(value) {
  try {
    const input = isRecord(value) ? value : {};
    if (!VALID_PHASES.has(input.phase)) return makeState(FIRST_SESSION_CONTINUATION_PHASES.idle);
    switch (input.phase) {
      case FIRST_SESSION_CONTINUATION_PHASES.map:
        return makeState(input.phase, { level1Completed: true, mechanicIntroSeen: input.mechanicIntroSeen === true });
      case FIRST_SESSION_CONTINUATION_PHASES.mechanicIntro:
        return makeState(input.phase, { level1Completed: true, mechanicIntroSeen: true });
      case FIRST_SESSION_CONTINUATION_PHASES.level2:
        return makeState(input.phase, { level1Completed: true, mechanicIntroSeen: true });
      case FIRST_SESSION_CONTINUATION_PHASES.bossTease:
        return makeState(input.phase, { level1Completed: true, mechanicIntroSeen: true, level2Completed: true });
      case FIRST_SESSION_CONTINUATION_PHASES.complete:
        return makeState(input.phase, { level1Completed: true, mechanicIntroSeen: true, level2Completed: true, bossTeaseSeen: true });
      case FIRST_SESSION_CONTINUATION_PHASES.idle:
      default:
        return makeState(FIRST_SESSION_CONTINUATION_PHASES.idle);
    }
  } catch {
    return makeState(FIRST_SESSION_CONTINUATION_PHASES.idle);
  }
}

export function createFirstSessionContinuation(value = {}) {
  return normalizeState(value);
}

export function transitionFirstSessionContinuation(state, event) {
  const current = normalizeState(state);
  if (!isRecord(event) || typeof event.type !== "string") return current;

  switch (event.type) {
    case "level1-complete":
      return current.phase === FIRST_SESSION_CONTINUATION_PHASES.idle
        ? makeState(FIRST_SESSION_CONTINUATION_PHASES.map, { level1Completed: true })
        : current;
    case "mechanic-intro":
      return current.phase === FIRST_SESSION_CONTINUATION_PHASES.map && current.level1Completed && !current.level2Completed
        ? makeState(FIRST_SESSION_CONTINUATION_PHASES.mechanicIntro, { level1Completed: true, mechanicIntroSeen: true })
        : current;
    case "mechanic-intro-start":
    case "mechanic-intro-skip":
      return current.phase === FIRST_SESSION_CONTINUATION_PHASES.mechanicIntro
        ? makeState(FIRST_SESSION_CONTINUATION_PHASES.level2, { level1Completed: true, mechanicIntroSeen: true })
        : current;
    case "level2-resume":
      return current.phase === FIRST_SESSION_CONTINUATION_PHASES.map && current.level1Completed && current.mechanicIntroSeen && !current.level2Completed
        ? makeState(FIRST_SESSION_CONTINUATION_PHASES.level2, { level1Completed: true, mechanicIntroSeen: true })
        : current;
    case "level2-complete":
      return current.phase === FIRST_SESSION_CONTINUATION_PHASES.level2
        ? makeState(FIRST_SESSION_CONTINUATION_PHASES.bossTease, { level1Completed: true, mechanicIntroSeen: true, level2Completed: true })
        : current;
    case "boss-tease-dismiss":
      return current.phase === FIRST_SESSION_CONTINUATION_PHASES.bossTease
        ? makeState(FIRST_SESSION_CONTINUATION_PHASES.complete, { level1Completed: true, mechanicIntroSeen: true, level2Completed: true, bossTeaseSeen: true })
        : current;
    case "exit":
      return current.phase === FIRST_SESSION_CONTINUATION_PHASES.idle || current.phase === FIRST_SESSION_CONTINUATION_PHASES.map
        ? current
        : makeState(FIRST_SESSION_CONTINUATION_PHASES.map, {
          level1Completed: current.level1Completed,
          mechanicIntroSeen: current.mechanicIntroSeen,
          level2Completed: current.level2Completed,
          bossTeaseSeen: current.bossTeaseSeen,
        });
    case "reset":
      return makeState(FIRST_SESSION_CONTINUATION_PHASES.idle);
    default:
      return current;
  }
}
