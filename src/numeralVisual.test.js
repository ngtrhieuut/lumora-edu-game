import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const readSource = (name) => fs.readFileSync(path.join(srcDir, name), "utf8");

test("numeral recognition prototype exposes a bounded visual interaction contract", () => {
  const app = readSource("App.jsx");
  const css = readSource("styles.css");
  const prototypes = readSource("prototypeNodes.js");
  const specs = readSource("interactionSpecs.js");

  assert.match(app, /function NumeralRecognitionBoard\(/);
  assert.match(app, /chooseNumeral\(/);
  assert.match(app, /data-drop-zone="core"/);
  assert.match(app, /data-numeral-value=\{value\}/);
  assert.match(app, /node\.type === "numeral"/);
  assert.match(prototypes, /id: "prototype-numeral"/);
  assert.match(prototypes, /type: "numeral"/);
  assert.match(specs, /numeral: freezeSpec\(/);
  assert.match(css, /\.numeral-recognition-board\s*\{/);
  assert.match(css, /\.numeral-core\.ready/);
  assert.match(css, /\.numeral-token\[data-numeral-state="wrong"\]/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
