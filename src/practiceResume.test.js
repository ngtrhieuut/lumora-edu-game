import assert from "node:assert/strict";
import { test } from "node:test";
import { advancePracticeSession, createPracticeSession } from "./practiceEngine.js";
import {
  createPracticeResume,
  createPracticeResumeStore,
  LOCAL_PRACTICE_RESUME_PROVIDER,
  normalizePracticeResume,
  PRACTICE_RESUME_PHASES,
  PRACTICE_RESUME_VERSION,
} from "./practiceResume.js";

const TODAY = new Date().toISOString().slice(0, 10);
const YESTERDAY = new Date(Date.parse(`${TODAY}T00:00:00.000Z`) - 86400000).toISOString().slice(0, 10);
const NODES = [
  { id: "collect", type: "collect", index: 1 },
  { id: "match", type: "match", index: 2 },
  { id: "bridge", type: "bridge", index: 3 },
  { id: "mixed", type: "mixed", index: 4 },
];

function makeSession() {
  return createPracticeSession(["collect", "match", "bridge"], { startedAt: "2026-08-11T10:20:30Z" });
}

function makeAdvancedSession() {
  const initial = makeSession();
  const first = advancePracticeSession(initial, {
    nodeId: "collect",
    skillId: "count",
    mastery: 3,
    supportsUsed: 0,
    attempts: 1,
    durationSeconds: 12,
  });
  return advancePracticeSession(first, {
    nodeId: "match",
    skillId: "count",
    mastery: 2,
    supportsUsed: 1,
    attempts: 2,
    durationSeconds: 24,
  });
}

function memoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values,
  };
}

test("resume requires the current ISO date and expires stale payloads", () => {
  const session = makeSession();
  const resume = createPracticeResume({ session, phase: "practice-play", dateKey: TODAY });

  assert.ok(resume);
  assert.equal(normalizePracticeResume(resume, NODES, { dateKey: TODAY }).dateKey, TODAY);
  assert.equal(normalizePracticeResume(resume, NODES, { dateKey: YESTERDAY }), null);
  assert.equal(normalizePracticeResume({ ...resume, dateKey: YESTERDAY }, NODES, { dateKey: TODAY }), null);
  assert.equal(normalizePracticeResume({ ...resume, dateKey: "2026-02-30" }, NODES), null);
});

test("resume validates version, direct-mechanic queue bounds, and session prefix", () => {
  const resume = createPracticeResume({ session: makeSession(), dateKey: TODAY });
  assert.equal(resume.version, PRACTICE_RESUME_VERSION);
  assert.equal(normalizePracticeResume({ ...resume, version: 2 }, NODES, { dateKey: TODAY }), null);
  assert.equal(normalizePracticeResume({ ...resume, schema: "other" }, NODES, { dateKey: TODAY }), null);

  assert.equal(
    normalizePracticeResume({ ...resume, session: { ...resume.session, queue: ["collect", "mixed"] } }, NODES, { dateKey: TODAY }),
    null,
  );
  assert.equal(
    normalizePracticeResume({ ...resume, session: { ...resume.session, queue: ["collect", "match", "bridge", "collect"] } }, NODES, { dateKey: TODAY }),
    null,
  );
  assert.equal(
    normalizePracticeResume({ ...resume, session: { ...resume.session, currentIndex: 1 } }, NODES, { dateKey: TODAY }),
    null,
  );
  assert.equal(
    normalizePracticeResume({
      ...resume,
      session: { ...resume.session, currentIndex: 1, completed: [{ nodeId: "match" }] },
    }, NODES, { dateKey: TODAY }),
    null,
  );
  assert.equal(
    normalizePracticeResume({
      ...resume,
      session: { ...resume.session, currentIndex: resume.session.queue.length, completed: [] },
    }, NODES, { dateKey: TODAY }),
    null,
  );
});

test("resume replays results through practiceEngine and rejects malformed results", () => {
  const base = createPracticeResume({ session: makeSession(), dateKey: TODAY });
  const raw = {
    ...base,
    phase: "practice-checkpoint",
    session: {
      ...base.session,
      currentIndex: 1,
      completed: [{
        nodeId: "collect",
        skillId: " count ",
        mastery: 99,
        supportsUsed: -4,
        attempts: 0,
        durationSeconds: -8,
        ignored: "drop",
      }],
    },
  };
  const normalized = normalizePracticeResume(raw, NODES, { dateKey: TODAY });
  assert.deepEqual(normalized.session.completed, [{
    nodeId: "collect",
    skillId: "count",
    mastery: 3,
    supportsUsed: 0,
    attempts: 1,
    durationSeconds: 0,
  }]);

  for (const completed of [null, {}, { nodeId: "match" }, { nodeId: "collect", mastery: "bad" }]) {
    const malformed = {
      ...raw,
      session: { ...raw.session, completed: [completed] },
    };
    if (completed?.nodeId === "collect") {
      assert.ok(normalizePracticeResume(malformed, NODES, { dateKey: TODAY }), "engine safely normalizes scalar counters");
    } else {
      assert.equal(normalizePracticeResume(malformed, NODES, { dateKey: TODAY }), null);
    }
  }
});

test("resume creation clones and deeply freezes canonical data, with phase fallback", () => {
  const session = makeAdvancedSession();
  const before = structuredClone(session);
  const resume = createPracticeResume({ session, phase: "unknown", dateKey: TODAY });

  assert.equal(resume.phase, "practice-intro");
  assert.notStrictEqual(resume.session, session);
  assert.notStrictEqual(resume.session.queue, session.queue);
  assert.notStrictEqual(resume.session.completed, session.completed);
  assert.deepEqual(session, before);
  assert.equal(Object.isFrozen(resume), true);
  assert.equal(Object.isFrozen(resume.session), true);
  assert.equal(Object.isFrozen(resume.session.queue), true);
  assert.equal(Object.isFrozen(resume.session.completed), true);

  session.queue[0] = "bridge";
  session.completed[0].mastery = 1;
  assert.equal(resume.session.queue[0], "collect");
  assert.equal(resume.session.completed[0].mastery, 3);
  assert.equal(createPracticeResume({ session: { ...session, currentIndex: 3, completed: [] }, dateKey: TODAY }), null);
  assert.deepEqual(PRACTICE_RESUME_PHASES, ["practice-intro", "practice-play", "practice-checkpoint", "practice-puzzle", "practice-discovery"]);
});

test("practice resume store parses JSON, preserves caller normalization boundary, and never throws", () => {
  const storage = memoryStorage();
  const store = createPracticeResumeStore({ storage, key: "practice" });
  const payload = { version: 999, dateKey: "stale", ignored: true };

  assert.equal(store.save(payload).status, "ok");
  assert.deepEqual(store.load().data, payload, "load does not normalize; caller owns validation");
  assert.equal(store.clear().status, "ok");
  assert.equal(store.load().status, "empty");
  assert.equal(store.descriptor.local, true);
  assert.equal(store.descriptor.offline, true);
  assert.equal(store.descriptor.remote, false);
  assert.equal(LOCAL_PRACTICE_RESUME_PROVIDER.syncsToFirebase, false);

  const corrupt = createPracticeResumeStore({ storage: memoryStorage({ practice: "{bad" }), key: "practice" });
  assert.equal(corrupt.load().status, "error");
  assert.doesNotThrow(() => corrupt.load());

  const throwing = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("full"); },
    removeItem() { throw new Error("denied"); },
  };
  const safe = createPracticeResumeStore({ storage: throwing, key: "practice" });
  assert.doesNotThrow(() => safe.load());
  assert.doesNotThrow(() => safe.save({}));
  assert.doesNotThrow(() => safe.clear());
  assert.equal(safe.load().status, "error");
  assert.equal(safe.save({}).status, "error");
  assert.equal(safe.clear().status, "error");
});
