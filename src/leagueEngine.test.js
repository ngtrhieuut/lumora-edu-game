import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildLeagueSnapshot,
  calculateLeagueScore,
  LEAGUE_DEMO_PROVIDER,
  sanitizeLeagueAlias,
} from "./leagueEngine.js";

const progress = {
  completed: ["a", "b"],
  learningMetrics: {
    skillA: { bestMastery: 3 },
    b: { bestMastery: 1 },
  },
  nodeOutcomes: { a: { skillId: "skillA" }, b: { skillId: "b" } },
  shards: 999,
  gameplayMetrics: { replays: 500, totalActions: 99999 },
  practiceMetrics: { totalSeconds: 99999 },
};
const validNodes = [{ id: "a", skillId: "skillA" }, { id: "b", skillId: "b" }];

test("league score uses only unique completions and best mastery", () => {
  assert.equal(calculateLeagueScore(progress, { validNodes }), 42);
  assert.equal(calculateLeagueScore({ ...progress, completed: ["a", "a", "b"] }, { validNodes }), 42);
  assert.equal(calculateLeagueScore({ ...progress, shards: 0, gameplayMetrics: { replays: 0 }, practiceMetrics: { totalSeconds: 0 } }, { validNodes }), 42);
  assert.equal(calculateLeagueScore({ ...progress, learningMetrics: { ...progress.learningMetrics, b: { bestMastery: 2 } } }, { validNodes }), 52);
  assert.equal(calculateLeagueScore({ ...progress, completed: ["fake"], learningMetrics: { fake: { bestMastery: 3 } } }, { validNodes }), 0);
});

test("league snapshot is deterministic, sorted and identifies the local row", () => {
  const first = buildLeagueSnapshot(progress, { alias: " An ", validNodes });
  const second = buildLeagueSnapshot(progress, { alias: " An ", validNodes });
  assert.deepEqual(first, second);
  assert.deepEqual(first.standings.map((row) => row.score), [...first.standings.map((row) => row.score)].sort((a, b) => b - a));
  assert.equal(first.standings.filter((row) => row.isUser).length, 1);
  assert.equal(first.standings.find((row) => row.isUser).alias, "An");
  assert.equal(first.userRank, first.standings.find((row) => row.isUser).rank);
});

test("league aliases are privacy-bounded and malformed progress is safe", () => {
  assert.equal(sanitizeLeagueAlias("  Bé    Ánh Sáng  "), "Bé Ánh Sáng");
  assert.equal(sanitizeLeagueAlias("x"), "Nhà Thám Hiểm");
  assert.equal(sanitizeLeagueAlias("12345678901234567890").length, 16);
  assert.equal(buildLeagueSnapshot(null, { validNodes }).score, 0);
  assert.equal(buildLeagueSnapshot({ completed: "bad" }, { validNodes }).standings.length, 5);
});

test("league descriptor and rewards cannot imply real cloud competition or power", () => {
  const snapshot = buildLeagueSnapshot(progress, { validNodes });
  assert.equal(LEAGUE_DEMO_PROVIDER.local, true);
  assert.equal(LEAGUE_DEMO_PROVIDER.syncsToFirebase, false);
  assert.equal(LEAGUE_DEMO_PROVIDER.realPlayers, false);
  assert.equal(snapshot.rewards.shards, 0);
  assert.equal(snapshot.rewards.power, 0);
  assert.equal(snapshot.rewards.cosmeticOnly, true);
  assert.deepEqual(snapshot.scoring, { uniqueCompletion: 1, bestMastery: 10, replay: 0, shards: 0, timeOnline: 0 });
});
