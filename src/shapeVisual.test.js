import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const readSource = (name) => fs.readFileSync(path.join(srcDir, name), "utf8");

test("Shape workshop exposes an active repair and energy handoff loop", () => {
  const app = readSource("App.jsx");
  const css = readSource("styles.css");

  assert.match(app, /const \[feedback, setFeedback\] = useState\(null\)/);
  assert.match(app, /const \[lastPoweredShape, setLastPoweredShape\] = useState\(null\)/);
  assert.match(app, /showFeedback\("wrong"\)/);
  assert.match(app, /showFeedback\("correct", draggedShape\)/);
  assert.match(app, /window\.setTimeout\(\(\) => \{[\s\S]*onFinish\(\);[\s\S]*\}, 640\)/);
  assert.match(app, /data-active-shape=\{nextShape \?\? "none"\}/);
  assert.match(app, /data-shape-feedback=\{feedback \?\? \(state\.complete \? "complete" : "idle"\)\}/);
  assert.match(app, /data-landed-shape=\{lastPoweredShape \?\? "none"\}/);
  assert.match(app, /data-slot-state=\{slotState\}/);
  assert.match(app, /data-drop-landed=\{lastPoweredShape === shape \? "true" : undefined\}/);
  assert.match(app, /aria-current=\{isActive \? "step" : undefined\}/);
  assert.match(app, /className="shape-module-dots"/);
  assert.match(css, /\.machine-slot\.active\s*\{[^}]*shape-slot-call/s);
  assert.match(css, /\.machine-slot\.queued\s*\{[^}]*opacity:/s);
  assert.match(css, /\.machine-slot\[data-drop-landed="true"\]/);
  assert.match(css, /\.shape-machine\.is-resonating\s*\{[^}]*box-shadow:/s);
  assert.match(css, /\.shape-machine\.is-resonating \.machine-core-badge > span\s*\{[^}]*shape-core-resonate/s);
  assert.match(css, /@keyframes shape-conduit-handoff/);
  assert.match(css, /\.shape-module-dots span\.is-lit\s*\{[^}]*box-shadow:/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.machine-slot\.active,[\s\S]*\.shape-machine\.is-resonating \.machine-conduit \{ animation: none !important; \}/s);
});
