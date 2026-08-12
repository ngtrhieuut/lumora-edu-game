import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AUDIO_PREFERENCE_KEY,
  createLocalAudioPreferenceStore,
  createLocalAudioProvider,
  LOCAL_AUDIO_PROVIDER,
  normalizeAudioPreferences,
} from "./services/audioProvider.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
    values,
  };
}

function fakeAudioContext({ resumeRejects = false } = {}) {
  const gains = [];
  const oscillators = [];
  const context = {
    state: "suspended",
    currentTime: 4,
    destination: {},
    resume: async () => {
      if (resumeRejects) throw new Error("blocked");
      context.state = "running";
    },
    createGain: () => {
      const events = [];
      const gain = { gain: { setValueAtTime: (...args) => events.push(["set", ...args]), exponentialRampToValueAtTime: (...args) => events.push(["ramp", ...args]) }, connect: () => {}, events };
      gains.push(gain);
      return gain;
    },
    createOscillator: () => {
      const oscillator = { frequency: { setValueAtTime: () => {} }, connect: () => {}, startCalls: [], stopCalls: [], start(value) { this.startCalls.push(value); }, stop(value) { this.stopCalls.push(value); } };
      oscillators.push(oscillator);
      return oscillator;
    },
    gains,
    oscillators,
  };
  return context;
}

test("audio preferences are canonical and privacy-minimal", () => {
  assert.deepEqual(normalizeAudioPreferences(), { muted: false, effectsEnabled: true, narrationEnabled: true, volume: 0.65 });
  assert.deepEqual(normalizeAudioPreferences({ muted: true, effectsEnabled: false, narrationEnabled: false, volume: 8, alias: "An" }), { muted: true, effectsEnabled: false, narrationEnabled: false, volume: 1 });
  assert.equal(normalizeAudioPreferences({ volume: -2 }).volume, 0);
  assert.equal("alias" in normalizeAudioPreferences({ alias: "An" }), false);
  assert.equal(LOCAL_AUDIO_PROVIDER.cloudTts, false);
  assert.equal(LOCAL_AUDIO_PROVIDER.recordsMicrophone, false);
});

test("preference store round-trips only canonical fields", () => {
  const storage = memoryStorage();
  const store = createLocalAudioPreferenceStore({ storage });
  assert.equal(store.load().status, "empty");
  const saved = store.save({ muted: true, volume: 0.3, privateNote: "child@example.com" });
  assert.equal(saved.ok, true);
  assert.deepEqual(store.load().data, { muted: true, effectsEnabled: true, narrationEnabled: true, volume: 0.3 });
  assert.equal(storage.values.get(AUDIO_PREFERENCE_KEY).includes("privateNote"), false);
});

test("preference store handles corrupt, throwing and absent storage", () => {
  const corrupt = memoryStorage();
  corrupt.setItem(AUDIO_PREFERENCE_KEY, "{");
  assert.equal(createLocalAudioPreferenceStore({ storage: corrupt }).load().status, "corrupt");
  const throwing = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.equal(createLocalAudioPreferenceStore({ storage: throwing }).load().ok, false);
  assert.equal(createLocalAudioPreferenceStore({ storage: throwing }).save({ muted: true }).ok, false);
  assert.equal(createLocalAudioPreferenceStore().load().status, "unavailable");
});

test("provider is gesture-gated, allowlisted and respects disabled preferences", async () => {
  const context = fakeAudioContext();
  const provider = createLocalAudioProvider({ audioContextFactory: () => context });
  assert.equal((await provider.playCue("tap")).reason, "gesture-required");
  assert.equal((await provider.playCue("unknown")).reason, "unknown-cue");
  assert.equal((await provider.unlockFromGesture()).ok, true);
  provider.setPreferences({ muted: true });
  assert.equal((await provider.playCue("tap")).reason, "effects-disabled");
  provider.setPreferences({ muted: false, effectsEnabled: false });
  assert.equal((await provider.playCue("hint")).reason, "effects-disabled");
});

test("procedural cues play gently with clamped volume and cooldown", async () => {
  let now = 1000;
  const context = fakeAudioContext();
  const provider = createLocalAudioProvider({ audioContextFactory: () => context, clock: () => now, cooldownMs: 300 });
  provider.setPreferences({ volume: 1 });
  await provider.unlockFromGesture();
  assert.equal((await provider.playCue("success", { dedupeKey: "level-1" })).ok, true);
  assert.equal(context.oscillators.length, 3);
  const peak = context.gains[0].events.find((event) => event[0] === "ramp")[1];
  assert.ok(peak <= 0.09, "cue peak remains gentle");
  assert.equal((await provider.playCue("success", { dedupeKey: "level-1" })).reason, "deduped");
  now += 301;
  assert.equal((await provider.playCue("success", { dedupeKey: "level-1" })).ok, true);
});

test("audio context failures are controlled", async () => {
  const throwing = createLocalAudioProvider({ audioContextFactory: () => { throw new Error("no device"); } });
  assert.equal((await throwing.unlockFromGesture()).reason, "audio-context-failed");
  assert.equal((await throwing.playCue("tap")).reason, "playback-failed");

  const rejectingContext = fakeAudioContext({ resumeRejects: true });
  const rejecting = createLocalAudioProvider({ audioContextFactory: () => rejectingContext });
  assert.equal((await rejecting.unlockFromGesture()).reason, "audio-context-failed");
});

test("narration requires a local Vietnamese voice and caps text", async () => {
  const spoken = [];
  const synthesis = { voices: [{ lang: "en-US", localService: true }, { lang: "vi-VN", localService: true, name: "Local Vi" }], getVoices() { return this.voices; }, cancelCalls: 0, cancel() { this.cancelCalls += 1; }, speak(value) { spoken.push(value); } };
  const provider = createLocalAudioProvider({
    audioContextFactory: () => fakeAudioContext(),
    speechSynthesis: synthesis,
    utteranceFactory: (text) => ({ text }),
  });
  await provider.unlockFromGesture();
  const result = await provider.narrate(`  ${"Ánh sáng ".repeat(40)}  `, { dedupeKey: "objective" });
  assert.equal(result.ok, true);
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].text.length, 240);
  assert.equal(spoken[0].voice.lang, "vi-VN");
  assert.equal(spoken[0].volume, 0.65);

  const remoteOnly = createLocalAudioProvider({ speechSynthesis: { getVoices: () => [{ lang: "vi-VN", localService: false }], cancel: () => {}, speak: () => { throw new Error("must not speak"); } } });
  await remoteOnly.unlockFromGesture();
  assert.equal((await remoteOnly.narrate("Xin chào")).reason, "local-voice-unavailable");
});

test("narration disabled, empty text, dedupe and stop remain safe", async () => {
  let now = 1;
  const spoken = [];
  const synthesis = { getVoices: () => [{ lang: "vi-VN", localService: true }], cancelCalls: 0, cancel() { this.cancelCalls += 1; }, speak: (value) => spoken.push(value) };
  const context = fakeAudioContext();
  const provider = createLocalAudioProvider({ audioContextFactory: () => context, speechSynthesis: synthesis, utteranceFactory: (text) => ({ text }), clock: () => now });
  await provider.unlockFromGesture();
  provider.setPreferences({ narrationEnabled: false });
  assert.equal((await provider.narrate("Mục tiêu")).reason, "narration-disabled");
  provider.setPreferences({ narrationEnabled: true });
  assert.equal((await provider.narrate("   ")).reason, "empty-text");
  assert.equal((await provider.narrate("Mục tiêu", { dedupeKey: "one" })).ok, true);
  assert.equal((await provider.narrate("Mục tiêu", { dedupeKey: "one" })).reason, "deduped");
  assert.doesNotThrow(() => provider.stop());
  assert.ok(synthesis.cancelCalls >= 1);
});
