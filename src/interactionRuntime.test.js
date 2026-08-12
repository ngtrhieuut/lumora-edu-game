import assert from "node:assert/strict";
import test from "node:test";
import { INTERACTION_SPECS } from "./interactionSpecs.js";
import {
  ALLOWED_AUDIO_CUES,
  getInteractionAudioCue,
  normalizeAnimationCue,
  normalizeAudioCues,
  normalizeInteractionRuntime,
} from "./interactionRuntime.js";

test("malformed interaction metadata fails closed", () => {
  for (const spec of [null, undefined, "spec", [], { animationCue: "   ", audioCues: "success" }]) {
    assert.deepEqual(normalizeInteractionRuntime(spec), { animationCue: null, audioCues: [] });
  }

  assert.equal(normalizeAnimationCue(42), null);
  assert.equal(normalizeAnimationCue(" \t\n"), null);
  assert.deepEqual(normalizeAudioCues(null), []);
  assert.deepEqual(normalizeAudioCues(["unknown", null, 4, " "]), []);
});

test("animation and audio metadata are normalized to the allowlisted runtime contract", () => {
  const runtime = normalizeInteractionRuntime({
    animationCue: "  seed-to-core  ",
    audioCues: ["success", "unknown", "success", "tap", "evolution", "tap"],
    ignored: "not exposed",
  });

  assert.deepEqual(runtime, {
    animationCue: "seed-to-core",
    audioCues: ["success", "tap", "evolution"],
  });
  assert.deepEqual(ALLOWED_AUDIO_CUES, ["tap", "soft-fail", "hint", "success", "evolution"]);
  assert.equal(Object.isFrozen(ALLOWED_AUDIO_CUES), true);
});

test("audio cue selection prefers an allowed request, then an allowed fallback", () => {
  const spec = { audioCues: ["tap", "success"] };

  assert.equal(getInteractionAudioCue(spec, "success", "tap"), "success");
  assert.equal(getInteractionAudioCue(spec, "hint", "tap"), "tap");
  assert.equal(getInteractionAudioCue(spec, "hint", "soft-fail"), null);
  assert.equal(getInteractionAudioCue(null, "success", "tap"), null);
  assert.equal(getInteractionAudioCue(spec, "success", "unknown"), "success");
});

test("runtime normalization does not mutate input and returns immutable values", () => {
  const spec = { animationCue: "phase-chain", audioCues: ["tap", "success"] };
  const snapshot = structuredClone(spec);
  const runtime = normalizeInteractionRuntime(spec);

  assert.deepEqual(spec, snapshot);
  assert.notStrictEqual(runtime, spec);
  assert.notStrictEqual(runtime.audioCues, spec.audioCues);
  assert.equal(Object.isFrozen(runtime), true);
  assert.equal(Object.isFrozen(runtime.audioCues), true);
  assert.throws(() => runtime.audioCues.push("hint"), TypeError);

  spec.audioCues.push("hint");
  assert.deepEqual(runtime.audioCues, ["tap", "success"]);
});

test("all existing interaction specs normalize to their safe canonical cues", () => {
  assert.equal(Object.isFrozen(INTERACTION_SPECS), true);
  assert.equal(Object.keys(INTERACTION_SPECS).length, 17);

  for (const spec of Object.values(INTERACTION_SPECS)) {
    const runtime = normalizeInteractionRuntime(spec);
    assert.equal(runtime.animationCue, spec.animationCue, spec.id);
    assert.deepEqual(runtime.audioCues, spec.audioCues, spec.id);
    assert.equal(Object.isFrozen(runtime), true, spec.id);
    assert.equal(Object.isFrozen(runtime.audioCues), true, spec.id);
    for (const cue of runtime.audioCues) assert.ok(ALLOWED_AUDIO_CUES.includes(cue), `${spec.id}: ${cue}`);
  }

  assert.equal(getInteractionAudioCue(INTERACTION_SPECS.boss, "evolution", "success"), "evolution");
  assert.equal(getInteractionAudioCue(INTERACTION_SPECS.collect, "evolution", "success"), "success");
});
