import test from "node:test";
import assert from "node:assert/strict";
import { ALL_LEVELS, getChapterBoss, getGrandBoss, getGradeLevels, validateLevelCatalog } from "./index.js";

test("catalog contains exactly 500 valid levels", () => {
  const audit = validateLevelCatalog(ALL_LEVELS);
  assert.equal(audit.valid, true, audit.errors.join("\n"));
  assert.equal(audit.count, 500);
});

test("each grade has 100 levels, nine chapter bosses and one grand boss", () => {
  for (const grade of [1,2,3,4,5]) {
    const levels = getGradeLevels(grade);
    assert.equal(levels.length, 100);
    assert.equal(levels.filter((level) => level.type === "chapter-boss").length, 9);
    assert.equal(levels.filter((level) => level.type === "grand-boss").length, 1);
    for (let chapter=1; chapter<=10; chapter++) assert.equal(getChapterBoss(grade, chapter)?.order, chapter*10);
    assert.equal(getGrandBoss(grade)?.order, 100);
  }
});

test("new catalog does not depend on generic XP", () => {
  assert.equal(ALL_LEVELS.every((level) => level.rewards.xp === 0), true);
});
