// Lumora Oracle provider — local rule-based hint ladders.
// Deliberately not Gemini: no generative AI is called or mocked. A later
// integration can swap this provider interface for a real Gemini client.

/** Stable Vietnamese fallback used when a type has no ladder. */
export const FALLBACK_HINT = "Hãy thử lại nhé — quan sát kỹ màn hình một chút.";

/** Provider descriptor: local, rule-based, not Gemini. */
export const LOCAL_ORACLE_PROVIDER = Object.freeze({
  id: "rule-based-oracle",
  kind: "oracle",
  name: "Adaptive rule-based Oracle (bản địa)",
  local: true,
  remote: false,
  generativeAI: false,
  usesGemini: false,
  provider: "rules",
  note: "Mastery-aware pacing plus approved hint ladders. Gemini is a later integration, not simulated.",
});

const clampInt = (value, min, max) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, Math.trunc(value))) : min;

/**
 * Decide when Mạch may offer the first automatic hint. The policy uses only
 * coarse local learning context; it never needs alias or contact data.
 */
export function getAdaptiveSupportPlan({ ageBand, bestMastery, completions } = {}) {
  const mastery = clampInt(bestMastery, 0, 3);
  const priorCompletions = clampInt(completions, 0, Infinity);
  if (mastery >= 3) {
    return Object.freeze({ id: "independent-stretch", autoHintAfter: 3, pace: "self-discovery" });
  }
  if (ageBand === "5-6") {
    return Object.freeze({ id: "early-visual", autoHintAfter: 1, pace: "visual-first" });
  }
  if (priorCompletions > 0 && mastery <= 1) {
    return Object.freeze({ id: "recovery-scaffold", autoHintAfter: 1, pace: "step-sooner" });
  }
  return Object.freeze({ id: "balanced", autoHintAfter: 2, pace: "balanced" });
}

/** @param {Record<string,string[]>} [hintsByType] type -> 1-based hint ladder (strings) */
export function createRuleBasedOracleProvider(hintsByType = {}, options = {}) {
  const errorHints = options && typeof options === "object" && !Array.isArray(options) && options.errorHints && typeof options.errorHints === "object"
    ? options.errorHints
    : {};

  /** @param {{type?:string, level?:number, errorCode?:string}} [req]
   *  @returns {{type:string, level:number, text:string, fallback:boolean, errorCode:string|null}} */
  function getHint({ type, level, errorCode } = { type: undefined, level: 1, errorCode: undefined }) {
    const normalizedErrorCode = typeof errorCode === "string" && errorCode.trim() ? errorCode.trim() : null;
    const errorLadder = normalizedErrorCode && errorHints[type]?.[normalizedErrorCode];
    const ladder = Array.isArray(errorLadder) && errorLadder.length > 0 ? errorLadder : hintsByType[type];
    if (!Array.isArray(ladder) || ladder.length === 0) {
      return normalizedErrorCode
        ? { type, level: 1, text: FALLBACK_HINT, fallback: true, errorCode: normalizedErrorCode }
        : { type, level: 1, text: FALLBACK_HINT, fallback: true };
    }
    const numeric = Number.isFinite(level) ? Math.trunc(level) : 1;
    const clamped = Math.min(Math.max(numeric, 1), ladder.length);
    return normalizedErrorCode
      ? { type, level: clamped, text: ladder[clamped - 1], fallback: false, errorCode: normalizedErrorCode }
      : { type, level: clamped, text: ladder[clamped - 1], fallback: false };
  }

  return Object.freeze({ descriptor: LOCAL_ORACLE_PROVIDER, getHint, getSupportPlan: getAdaptiveSupportPlan });
}
