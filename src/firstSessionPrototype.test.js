import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { getPrototypeNode } from "./prototypeNodes.js";
import { getFirstSessionNumeralPrototype } from "./firstSessionPrototype.js";

const sourceDir = path.dirname(fileURLToPath(import.meta.url));

test("first-session numeral gate accepts only the local zero-reward prototype", () => {
  const prototype = getFirstSessionNumeralPrototype(getPrototypeNode("prototype-numeral"));
  assert.equal(prototype?.id, "prototype-numeral");
  assert.equal(prototype?.approved, false);
  assert.equal(prototype?.reward, 0);
});

test("first-session numeral gate fails closed for malformed or approved content", () => {
  const base = getPrototypeNode("prototype-numeral");
  for (const value of [null, undefined, {}, { ...base, kind: "main" }, { ...base, type: "collect" }, { ...base, approved: true }, { ...base, reward: 1 }]) {
    assert.equal(getFirstSessionNumeralPrototype(value), null);
  }
});

test("first-session wiring keeps the prototype outside completion and persistence paths", () => {
  const app = fs.readFileSync(path.join(sourceDir, "App.jsx"), "utf8");
  assert.match(app, /view === "first-session-numeral"/);
  assert.match(app, /getFirstSessionNumeralPrototype\(getPrototypeNode\("prototype-numeral"\)\)/);
  assert.match(app, /type: "numeral-complete"/);
  assert.match(app, /startNode\(nodes\[0\]\)/);
  assert.doesNotMatch(app, /completeLevel\([^)]*prototype-numeral/);
});
