import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const readSource = (name) => fs.readFileSync(path.join(srcDir, name), "utf8");

test("Rune board turns the missing pattern into an actionable gate", () => {
  const app = readSource("App.jsx");
  const css = readSource("styles.css");

  assert.match(app, /const \[feedback, setFeedback\] = useState\(null\)/);
  assert.match(app, /const feedbackTimerRef = useRef\(null\)/);
  assert.match(app, /const finishTimerRef = useRef\(null\)/);
  assert.match(app, /if \(!value\) \{[\s\S]*errorCode: "no-selection"/);
  assert.match(app, /showFeedback\("wrong"\)/);
  assert.match(app, /showFeedback\("correct"\)/);
  assert.match(app, /window\.setTimeout\(\(\) => \{[\s\S]*onFinish\(\);[\s\S]*\}, 640\)/);
  assert.match(app, /window\.clearTimeout\(feedbackTimerRef\.current\)/);
  assert.match(app, /window\.clearTimeout\(finishTimerRef\.current\)/);
  assert.match(app, /data-rune-feedback=\{feedback \?\? "idle"\}/);
  assert.match(app, /onClick=\{\(\) => choose\(selected\)\}/);
  assert.match(app, /onClick=\{\(\) => \{ onAction\(\); setSelected\(rune\); setNotice/);
  assert.match(app, /validDropZones=\{\["missing"\]\} data-rune-option=\{rune\}/);
  assert.doesNotMatch(app, /validDropZones=\{rune === "crystal" \? \["missing"\] : \[\]\}/);
  assert.match(app, /Ô rune còn thiếu; chạm hoặc kéo rune vào đây/);
  assert.match(app, /className="rune-environment"/);
  assert.match(app, /Khu rừng đang gọi nhịp/);
  assert.match(css, /\.rune-environment\s*\{[^}]*grid-template-columns:/s);
  assert.match(css, /\.rune-environment-orbit\.secondary\s*\{[^}]*animation-direction:\s*reverse/s);
  assert.match(css, /\.rune-board\[data-rune-feedback="wrong"\] \.missing-rune\s*\{[^}]*rune-wrong-pulse/s);
  assert.match(css, /\.rune-board\[data-rune-feedback="correct"\] \.rune-environment\s*\{[^}]*box-shadow:/s);
  assert.match(css, /@keyframes rune-environment-spin/);
  assert.match(css, /@keyframes rune-wrong-pulse/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.rune-environment-orbit,[\s\S]*\.rune-board\[data-rune-feedback="wrong"\] \.missing-rune \{ animation: none !important; \}/s);
});
