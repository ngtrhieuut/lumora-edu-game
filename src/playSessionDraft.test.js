import assert from "node:assert/strict";
import { test } from "node:test";
import {
  advancePlaySessionDraft,
  createPlaySessionDraft,
  createPlaySessionDraftStore,
  LOCAL_PLAY_SESSION_DRAFT_PROVIDER,
  normalizePlaySessionDraft,
  PLAY_SESSION_DRAFT_VERSION,
} from "./playSessionDraft.js";

const NOW = "2026-08-11T10:20:30Z";
const NOW_CANONICAL = "2026-08-11T10:20:30.000Z";
const LATER = "2026-08-11T10:21:30+00:00";
const LATER_CANONICAL = "2026-08-11T10:21:30.000Z";
const NODE_IDS = ["main-1", "quest-node"];
const QUEST_IDS = ["quest-1"];

function memoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values,
  };
}

test("draft defaults to main, one phase, and canonical timestamps", () => {
  const draft = createPlaySessionDraft({ nodeId: " main-1 ", now: NOW });

  assert.deepEqual(draft, {
    version: PLAY_SESSION_DRAFT_VERSION,
    mode: "main",
    nodeId: "main-1",
    phaseIndex: 0,
    phaseCount: 1,
    startedAt: NOW_CANONICAL,
    updatedAt: NOW_CANONICAL,
  });
  assert.equal(Object.isFrozen(draft), true);
});

test("normalization requires current node and quest allowlists", () => {
  const main = normalizePlaySessionDraft({
    version: 1,
    mode: "main",
    nodeId: "main-1",
    startedAt: NOW,
    updatedAt: NOW,
  }, { validNodeIds: NODE_IDS, validQuestIds: QUEST_IDS, now: NOW });
  assert.equal(main.nodeId, "main-1");
  assert.equal(normalizePlaySessionDraft(main), null);
  assert.equal(normalizePlaySessionDraft({ ...main, nodeId: "unknown" }, { validNodeIds: NODE_IDS, now: NOW }), null);

  const quest = normalizePlaySessionDraft({
    ...main,
    mode: "quest",
    nodeId: "quest-node",
    questId: "quest-1",
  }, { validNodeIds: NODE_IDS, validQuestIds: QUEST_IDS, now: NOW });
  assert.deepEqual(quest, {
    ...main,
    mode: "quest",
    nodeId: "quest-node",
    questId: "quest-1",
  });
  assert.equal(normalizePlaySessionDraft({ ...quest, questId: "unknown" }, { validNodeIds: NODE_IDS, validQuestIds: QUEST_IDS, now: NOW }), null);
  assert.equal(normalizePlaySessionDraft({ ...quest, questId: undefined }, { validNodeIds: NODE_IDS, validQuestIds: QUEST_IDS, now: NOW }), null);
});

test("phase advancement is immutable, 0-based, and clamped to three phases", () => {
  const draft = createPlaySessionDraft({ nodeId: "main-1", phaseCount: 9, phaseIndex: -4, now: NOW });
  assert.equal(draft.phaseCount, 3);
  assert.equal(draft.phaseIndex, 0);

  const next = advancePlaySessionDraft(draft, { updatedAt: LATER });
  assert.equal(next.phaseIndex, 1);
  assert.equal(next.updatedAt, LATER_CANONICAL);
  assert.notStrictEqual(next, draft);
  assert.equal(draft.phaseIndex, 0);

  const final = advancePlaySessionDraft(next, { phaseIndex: 99, phaseCount: 99, updatedAt: LATER });
  assert.equal(final.phaseIndex, 2);
  assert.equal(final.phaseCount, 3);

  const reduced = advancePlaySessionDraft(final, { phaseCount: 0, phaseIndex: 99, updatedAt: LATER });
  assert.equal(reduced.phaseCount, 1);
  assert.equal(reduced.phaseIndex, 0);
});

test("malformed mode, version, timestamps, and PII fail closed or normalize safely", () => {
  const base = {
    version: 1,
    mode: "main",
    nodeId: "main-1",
    phaseIndex: "not-a-phase",
    phaseCount: 99,
    startedAt: "not-a-date",
    updatedAt: "also-not-a-date",
    alias: "Nubi",
    profile: { id: "child-1" },
    reward: { shards: 99 },
    mastery: 3,
    answer: "secret-answer",
  };
  const normalized = normalizePlaySessionDraft(base, { validNodeIds: NODE_IDS, now: NOW });

  assert.deepEqual(normalized, {
    version: 1,
    mode: "main",
    nodeId: "main-1",
    phaseIndex: 0,
    phaseCount: 3,
    startedAt: NOW_CANONICAL,
    updatedAt: NOW_CANONICAL,
  });
  assert.equal("alias" in normalized, false);
  assert.equal(normalizePlaySessionDraft({ ...base, mode: "side-quest" }, { validNodeIds: NODE_IDS, now: NOW }), null);
  assert.equal(normalizePlaySessionDraft({ ...base, version: 2 }, { validNodeIds: NODE_IDS, now: NOW }), null);
  assert.equal(normalizePlaySessionDraft({ ...base, nodeId: "unknown" }, { validNodeIds: NODE_IDS, now: NOW }), null);
});

test("create and advance clone input without retaining mutable or unrelated fields", () => {
  const input = {
    nodeId: "main-1",
    phaseCount: 2,
    startedAt: NOW,
    updatedAt: NOW,
    profile: { alias: "drop" },
  };
  const draft = createPlaySessionDraft(input);
  input.nodeId = "changed";
  input.profile.alias = "changed";

  assert.equal(draft.nodeId, "main-1");
  assert.equal("profile" in draft, false);
  assert.equal(Object.isFrozen(draft), true);

  const advanced = advancePlaySessionDraft(draft, { phaseIndex: 1, updatedAt: LATER, answer: "drop" });
  assert.equal(advanced.phaseIndex, 1);
  assert.equal("answer" in advanced, false);
  assert.equal(Object.isFrozen(advanced), true);
  assert.equal(draft.phaseIndex, 0);
});

test("draft store round-trips only canonical local data and clears safely", () => {
  const storage = memoryStorage();
  const store = createPlaySessionDraftStore({ storage, key: "active-play" });
  const draft = createPlaySessionDraft({ nodeId: "main-1", now: NOW });
  const saved = store.save({ ...draft, alias: "drop", reward: 10 });

  assert.equal(saved.status, "ok");
  assert.deepEqual(store.load().data, draft);
  assert.equal("alias" in store.load().data, false);
  assert.equal(store.clear().status, "ok");
  assert.equal(store.load().status, "empty");
  assert.equal(LOCAL_PLAY_SESSION_DRAFT_PROVIDER.local, true);
  assert.equal(LOCAL_PLAY_SESSION_DRAFT_PROVIDER.offline, true);
  assert.equal(LOCAL_PLAY_SESSION_DRAFT_PROVIDER.remote, false);
  assert.equal(LOCAL_PLAY_SESSION_DRAFT_PROVIDER.cloud, false);
  assert.equal(LOCAL_PLAY_SESSION_DRAFT_PROVIDER.syncsToCloud, false);
});

test("draft store fails closed for corrupt, throwing, and missing storage", () => {
  const corrupt = createPlaySessionDraftStore({ storage: memoryStorage({ active: "{bad" }), key: "active" });
  assert.equal(corrupt.load().status, "error");
  assert.equal(corrupt.load().data, null);

  const throwing = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("full"); },
    removeItem() { throw new Error("denied"); },
  };
  const safe = createPlaySessionDraftStore({ storage: throwing, key: "active" });
  assert.doesNotThrow(() => safe.load());
  assert.doesNotThrow(() => safe.save({ nodeId: "main-1", now: NOW }));
  assert.doesNotThrow(() => safe.clear());
  assert.equal(safe.load().status, "error");
  assert.equal(safe.save({ nodeId: "main-1", now: NOW }).status, "error");
  assert.equal(safe.clear().status, "error");

  const missing = createPlaySessionDraftStore({ key: "active" });
  assert.equal(missing.load().status, "error");
  assert.equal(missing.save({ nodeId: "main-1", now: NOW }).status, "error");
  assert.equal(missing.clear().status, "error");
});
