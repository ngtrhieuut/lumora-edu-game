import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const readSource = (name) => fs.readFileSync(path.join(srcDir, name), "utf8");

test("Match exposes an active group and bounded pairing feedback", () => {
  const app = readSource("App.jsx");
  const css = readSource("styles.css");

  assert.match(app, /const \[feedback, setFeedback\] = useState\(null\)/);
  assert.match(app, /const \[lastMatchedValue, setLastMatchedValue\] = useState\(null\)/);
  assert.match(app, /const nextValue = values\.find\(\(value\) => !matched\.includes\(value\)\) \?\? null/);
  assert.match(app, /showFeedback\("wrong"\)/);
  assert.match(app, /showFeedback\("correct", value\)/);
  assert.match(app, /data-active-group=\{nextValue \?\? "none"\}/);
  assert.match(app, /data-match-feedback=\{feedback \?\? \(matched\.length === values\.length \? "complete" : "idle"\)\}/);
  assert.match(app, /className="match-readout" role="status" aria-live="polite"/);
  assert.match(app, /data-match-state=\{matchedValue \? "matched" : isActive \? "active" : "queued"\}/);
  assert.match(app, /data-match-landed=\{lastMatchedValue === value \? "true" : undefined\}/);
  assert.match(app, /aria-current=\{value === nextValue \? "step" : undefined\}/);
  assert.match(app, /window\.setTimeout\(\(\) => \{[\s\S]*onFinish\(\);[\s\S]*\}, 640\)/);
  assert.match(css, /\.match-readout\s*\{[^}]*grid-column: 1\/-1/s);
  assert.match(css, /\.number-bank button\[data-match-state="active"\][^}]*match-number-call/s);
  assert.match(css, /\.group-bank \.match-group\.active::after[^}]*match-group-ring/s);
  assert.match(css, /\.group-bank \.match-group\.matched\s*\{[^}]*rgba\(88,223,137/s);
  assert.match(css, /\.group-bank \.match-group\[data-match-landed="true"\][^}]*match-group-landed/s);
  assert.match(css, /@keyframes match-tether-pulse/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.number-bank button\[data-match-state="active"\][\s\S]*\.match-board\[data-match-feedback="correct"\] \.energy-tethers i \{ animation: none !important; \}/s);
});
