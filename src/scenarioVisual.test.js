import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const readSource = (name) => fs.readFileSync(path.join(srcDir, name), "utf8");

test("Scenario board exposes a readable world-action loop", () => {
  const app = readSource("App.jsx");
  const css = readSource("styles.css");

  assert.match(app, /const \[lastServedFriend, setLastServedFriend\] = useState\(null\)/);
  assert.match(app, /const \[lastServedStationId, setLastServedStationId\] = useState\(null\)/);
  assert.match(app, /const activeFriend = state\.complete \? null : remainingByFriend\.miu > 0 \? "miu"/);
  assert.match(app, /const activeStationId = activeFriend/);
  assert.match(app, /data-active-friend=\{activeFriend \?\? "none"\}/);
  assert.match(app, /data-progress=\{`\$\{totalServed\}\/\$\{state\.portionIds\.length\}`\}/);
  assert.match(app, /className="scenario-progress-dots"/);
  assert.match(app, /data-station-state=\{stationState\}/);
  assert.match(app, /lastServedStationId === station\.id \? "served-pulse"/);
  assert.match(app, /role="status" aria-live="polite"><span aria-hidden="true">✦<\/span>\{scenarioNotice\}/);
  assert.match(app, /window\.setTimeout\(\(\) => \{[\s\S]*setLastServedStationId\(null\)/);
  assert.match(app, /window\.clearTimeout\(scenarioPulseTimerRef\.current\)/);
  assert.match(app, /validDropZones=\{\["miu", "ti"\]\.filter/);
  assert.match(app, /serveScenarioPortion\(state, friend, draggedPortion\)/);
  assert.match(css, /\.creature-station\.active\s*\{[^}]*scenario-need-pulse/s);
  assert.match(css, /\.creature-station\.queued\s*\{[^}]*opacity:/s);
  assert.match(css, /\.creature-station\.served-pulse\s*\{[^}]*scenario-served-pop/s);
  assert.match(css, /\.scenario-progress-dots span\.is-lit\s*\{[^}]*box-shadow:/s);
  assert.match(css, /@keyframes scenario-need-ring/);
  assert.match(css, /@keyframes scenario-served-pop/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.creature-station\.active,[\s\S]*\.creature-need-signal \{ animation: none !important; \}/s);
});
