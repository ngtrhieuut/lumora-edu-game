import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const readSource = (name) => fs.readFileSync(path.join(srcDir, name), "utf8");

test("Boss phase completion exposes a bounded energy handoff", () => {
  const app = readSource("App.jsx");
  const css = readSource("styles.css");

  assert.match(app, /const \[bossHandoff, setBossHandoff\] = useState\(null\)/);
  assert.match(app, /const bossHandoffTimerRef = useRef\(null\)/);
  assert.match(app, /if \(bossHandoff\) return/);
  assert.match(app, /const transition = completeBossPhase\(bossState, activePhase\.id\)/);
  assert.match(app, /if \(!transition\.accepted\) return/);
  assert.match(app, /setBossHandoff\(\{ nextPhaseIndex: transition\.state\.phaseIndex, complete: transition\.complete \}\)/);
  assert.match(app, /setPhaseIndex\(transition\.state\.phaseIndex\)/);
  assert.match(app, /data-phase-handoff=\{bossHandoff \? "true" : "false"\}/);
  assert.match(app, /className=\{`boss-core-chamber \$\{bossHandoff \? "is-resonating" : ""\}`\}/);
  assert.match(app, /className="boss-phase-handoff" role="status" aria-live="polite"/);
  assert.match(app, /window\.setTimeout\(\(\) => \{[\s\S]*setBossHandoff\(null\)[\s\S]*if \(transition\.complete\) onFinish\(\);[\s\S]*\}, 640\)/);
  assert.match(app, /window\.clearTimeout\(bossHandoffTimerRef\.current\)/);
  assert.match(css, /\.boss-core-chamber\.is-resonating\s*\{[^}]*boss-handoff-breathe/s);
  assert.match(css, /\.boss-core-chamber\.is-resonating \.boss-core-rune\s*\{[^}]*boss-handoff-core/s);
  assert.match(css, /\.boss-phase-handoff\s*\{[^}]*linear-gradient/s);
  assert.match(css, /@keyframes boss-handoff-wave/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.boss-core-chamber\.is-resonating,[\s\S]*\.boss-phase-handoff \{ animation: none !important; \}/s);
});
