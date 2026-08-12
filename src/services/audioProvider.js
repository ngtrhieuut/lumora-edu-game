export const AUDIO_PREFERENCE_KEY = "lumora-audio-preferences-v1";

export const LOCAL_AUDIO_PROVIDER = Object.freeze({
  id: "local-browser-audio-v1",
  provider: "browser-native",
  active: true,
  localOnly: true,
  cloudTts: false,
  recordsMicrophone: false,
  requiresUserGesture: true,
});

const DEFAULT_PREFERENCES = Object.freeze({
  muted: false,
  effectsEnabled: true,
  narrationEnabled: true,
  volume: 0.65,
});

const clampVolume = (value) => Number.isFinite(Number(value))
  ? Math.min(1, Math.max(0, Number(value)))
  : DEFAULT_PREFERENCES.volume;

export function normalizeAudioPreferences(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    muted: typeof input.muted === "boolean" ? input.muted : DEFAULT_PREFERENCES.muted,
    effectsEnabled: typeof input.effectsEnabled === "boolean" ? input.effectsEnabled : DEFAULT_PREFERENCES.effectsEnabled,
    narrationEnabled: typeof input.narrationEnabled === "boolean" ? input.narrationEnabled : DEFAULT_PREFERENCES.narrationEnabled,
    volume: clampVolume(input.volume),
  };
}

export function createLocalAudioPreferenceStore({ storage, key = AUDIO_PREFERENCE_KEY } = {}) {
  function load() {
    if (!storage || typeof storage.getItem !== "function") {
      return { ok: false, status: "unavailable", data: normalizeAudioPreferences() };
    }
    try {
      const raw = storage.getItem(key);
      if (raw == null) return { ok: true, status: "empty", data: normalizeAudioPreferences() };
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { ok: false, status: "corrupt", data: normalizeAudioPreferences() };
      }
      return { ok: true, status: "loaded", data: normalizeAudioPreferences(parsed) };
    } catch {
      return { ok: false, status: "corrupt", data: normalizeAudioPreferences() };
    }
  }

  function save(value) {
    const data = normalizeAudioPreferences(value);
    if (!storage || typeof storage.setItem !== "function") return { ok: false, status: "unavailable", data };
    try {
      storage.setItem(key, JSON.stringify(data));
      return { ok: true, status: "saved", data };
    } catch {
      return { ok: false, status: "error", data };
    }
  }

  return Object.freeze({ descriptor: LOCAL_AUDIO_PROVIDER, load, save });
}

const CUES = Object.freeze({
  tap: Object.freeze([[440, 0.045, 0]]),
  "soft-fail": Object.freeze([[220, 0.055, 0], [260, 0.05, 0.055]]),
  hint: Object.freeze([[520, 0.06, 0], [660, 0.08, 0.055]]),
  success: Object.freeze([[523, 0.07, 0], [659, 0.08, 0.065], [784, 0.12, 0.135]]),
  evolution: Object.freeze([[392, 0.12, 0], [523, 0.16, 0.1], [659, 0.22, 0.24]]),
});

const cleanNarration = (value) => typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 240) : "";

export function createLocalAudioProvider({
  windowRef,
  audioContextFactory,
  utteranceFactory,
  speechSynthesis,
  clock = () => Date.now(),
  cooldownMs = 350,
} = {}) {
  let preferences = normalizeAudioPreferences();
  let unlocked = false;
  let context = null;
  const activeOscillators = new Set();
  const lastPlayed = new Map();
  const synthesis = speechSynthesis ?? windowRef?.speechSynthesis ?? null;

  const dedupeBlocked = (key) => {
    const now = Number(clock());
    const previous = lastPlayed.get(key);
    if (Number.isFinite(previous) && Number.isFinite(now) && now - previous < Math.max(0, cooldownMs)) return true;
    if (Number.isFinite(now)) lastPlayed.set(key, now);
    return false;
  };

  const createContext = () => {
    if (context) return context;
    if (typeof audioContextFactory === "function") context = audioContextFactory();
    else {
      const Context = windowRef?.AudioContext ?? windowRef?.webkitAudioContext;
      if (!Context) return null;
      context = new Context();
    }
    return context;
  };

  function getPreferences() {
    return { ...preferences };
  }

  function setPreferences(next) {
    preferences = normalizeAudioPreferences({ ...preferences, ...(next && typeof next === "object" ? next : {}) });
    if (preferences.muted) stop();
    return getPreferences();
  }

  async function unlockFromGesture() {
    unlocked = true;
    try {
      const audioContext = createContext();
      if (audioContext?.state === "suspended" && typeof audioContext.resume === "function") await audioContext.resume();
      return { ok: true, reason: audioContext ? "unlocked" : "effects-unavailable" };
    } catch {
      return { ok: false, reason: "audio-context-failed" };
    }
  }

  function getNarrationCapability() {
    if (!synthesis || typeof synthesis.getVoices !== "function") return { available: false, reason: "speech-synthesis-unavailable", voice: null };
    try {
      const voice = (synthesis.getVoices() ?? []).find((item) => item?.localService === true && /^vi(?:-|_)/i.test(item.lang ?? "")) ?? null;
      return voice
        ? { available: true, reason: "local-vietnamese-voice", voice }
        : { available: false, reason: "local-voice-unavailable", voice: null };
    } catch {
      return { available: false, reason: "speech-synthesis-failed", voice: null };
    }
  }

  async function playCue(eventId, { dedupeKey } = {}) {
    if (!Object.hasOwn(CUES, eventId)) return { ok: false, reason: "unknown-cue" };
    if (preferences.muted || !preferences.effectsEnabled || preferences.volume === 0) return { ok: false, reason: "effects-disabled" };
    if (!unlocked) return { ok: false, reason: "gesture-required" };
    const key = `cue:${dedupeKey ?? eventId}`;
    if (dedupeBlocked(key)) return { ok: false, reason: "deduped" };

    try {
      const audioContext = createContext();
      if (!audioContext || typeof audioContext.createOscillator !== "function" || typeof audioContext.createGain !== "function") {
        return { ok: false, reason: "effects-unavailable" };
      }
      if (audioContext.state === "suspended" && typeof audioContext.resume === "function") await audioContext.resume();
      const start = Number(audioContext.currentTime) || 0;
      for (const [frequency, duration, offset] of CUES[eventId]) {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, start + offset);
        const peak = Math.min(0.09, 0.075 * preferences.volume);
        gain.gain.setValueAtTime(0.0001, start + offset);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + offset + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + duration);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        activeOscillators.add(oscillator);
        oscillator.onended = () => activeOscillators.delete(oscillator);
        oscillator.start(start + offset);
        oscillator.stop(start + offset + duration + 0.01);
      }
      return { ok: true, reason: "played", eventId };
    } catch {
      return { ok: false, reason: "playback-failed" };
    }
  }

  async function narrate(text, { dedupeKey } = {}) {
    if (preferences.muted || !preferences.narrationEnabled || preferences.volume === 0) return { ok: false, reason: "narration-disabled" };
    if (!unlocked) return { ok: false, reason: "gesture-required" };
    const cleanText = cleanNarration(text);
    if (!cleanText) return { ok: false, reason: "empty-text" };
    const capability = getNarrationCapability();
    if (!capability.available) return { ok: false, reason: capability.reason };
    const key = `narration:${dedupeKey ?? cleanText}`;
    if (dedupeBlocked(key)) return { ok: false, reason: "deduped" };

    try {
      const makeUtterance = utteranceFactory ?? ((value) => new windowRef.SpeechSynthesisUtterance(value));
      if (typeof makeUtterance !== "function" || !synthesis || typeof synthesis.speak !== "function") return { ok: false, reason: "speech-synthesis-unavailable" };
      const utterance = makeUtterance(cleanText);
      utterance.voice = capability.voice;
      utterance.lang = capability.voice.lang;
      utterance.rate = 0.92;
      utterance.pitch = 1.04;
      utterance.volume = preferences.volume;
      if (typeof synthesis.cancel === "function") synthesis.cancel();
      synthesis.speak(utterance);
      return { ok: true, reason: "spoken", textLength: cleanText.length };
    } catch {
      return { ok: false, reason: "narration-failed" };
    }
  }

  function stop() {
    for (const oscillator of activeOscillators) {
      try { oscillator.stop(); } catch { /* already stopped */ }
    }
    activeOscillators.clear();
    try { synthesis?.cancel?.(); } catch { /* unavailable synthesis */ }
    return { ok: true };
  }

  return Object.freeze({
    descriptor: LOCAL_AUDIO_PROVIDER,
    getPreferences,
    setPreferences,
    unlockFromGesture,
    getNarrationCapability,
    playCue,
    narrate,
    stop,
  });
}
