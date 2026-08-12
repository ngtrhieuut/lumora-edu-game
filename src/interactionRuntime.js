// Pure, fail-closed runtime projection for interaction metadata.

export const ALLOWED_AUDIO_CUES = Object.freeze([
  "tap",
  "soft-fail",
  "hint",
  "success",
  "evolution",
]);

const ALLOWED_AUDIO_CUE_SET = new Set(ALLOWED_AUDIO_CUES);
const EMPTY_AUDIO_CUES = Object.freeze([]);

function isRecord(value) {
  if (value === null || typeof value !== "object") return false;
  try {
    return !Array.isArray(value);
  } catch {
    return false;
  }
}

function readField(record, field) {
  try {
    return record?.[field];
  } catch {
    return undefined;
  }
}

export function normalizeAnimationCue(value) {
  if (typeof value !== "string") return null;
  const cue = value.trim();
  return cue.length > 0 ? cue : null;
}

export function normalizeAudioCues(value) {
  try {
    if (!Array.isArray(value)) return EMPTY_AUDIO_CUES;

    const seen = new Set();
    const cues = [];
    for (const cue of value) {
      if (typeof cue !== "string" || !ALLOWED_AUDIO_CUE_SET.has(cue) || seen.has(cue)) continue;
      seen.add(cue);
      cues.push(cue);
    }
    return Object.freeze(cues);
  } catch {
    return EMPTY_AUDIO_CUES;
  }
}

export function normalizeInteractionRuntime(spec) {
  const source = isRecord(spec) ? spec : null;
  return Object.freeze({
    animationCue: normalizeAnimationCue(readField(source, "animationCue")),
    audioCues: normalizeAudioCues(readField(source, "audioCues")),
  });
}

export function getInteractionAudioCue(spec, requestedCue, fallbackCue) {
  const { audioCues } = normalizeInteractionRuntime(spec);
  if (audioCues.includes(requestedCue)) return requestedCue;
  if (audioCues.includes(fallbackCue)) return fallbackCue;
  return null;
}
