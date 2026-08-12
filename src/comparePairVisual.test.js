import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const readSource = (name) => fs.readFileSync(path.join(srcDir, name), "utf8");

test("pairwise comparison prototype exposes distinct drag targets and review-only styling", () => {
  const app = readSource("App.jsx");
  const css = readSource("styles.css");
  const prototypes = readSource("prototypeNodes.js");
  const specs = readSource("interactionSpecs.js");

  assert.match(app, /function ComparePairBoard\(/);
  assert.match(app, /answerComparePair\(/);
  assert.match(app, /data-compare-object=\{side\}/);
  assert.match(app, /data-compare-zone=\{zoneId\}/);
  assert.match(app, /aria-label=\{`Chọn \$\{object\.label\.toLowerCase\(\)\} để so sánh; kéo vào ô phù hợp`\}/);
  assert.doesNotMatch(app, /aria-label=\{`Kéo \$\{object\.label\.toLowerCase\(\)\} vào ô \$\{COMPARE_PAIR_ZONE_LABELS/);
  assert.match(app, /node\.type === "compare-pair"/);
  assert.match(prototypes, /id: "prototype-compare-pair"/);
  assert.match(prototypes, /type: "compare-pair"/);
  assert.match(specs, /"compare-pair": freezeSpec\(/);
  assert.match(css, /\.compare-pair-board\s*\{/);
  assert.match(css, /\.compare-pair-object\.large/);
  assert.match(css, /\.compare-pair-zone\.target/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
