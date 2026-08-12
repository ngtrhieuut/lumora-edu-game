import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const readSource = (name) => fs.readFileSync(path.join(srcDir, name), "utf8");

test("ordering prototype exposes direct placement and a local-only review boundary", () => {
  const app = readSource("App.jsx");
  const css = readSource("styles.css");
  const prototypes = readSource("prototypeNodes.js");
  const specs = readSource("interactionSpecs.js");

  assert.match(app, /function OrderBoard\(/);
  assert.match(app, /createOrderState\(/);
  assert.match(app, /placeOrderItem\(/);
  assert.match(app, /getOrderAvailableSlotIds\(/);
  assert.match(app, /data-drop-zone=\{String\(index\)\}/);
  assert.match(app, /data-order-option=\{item\.id\}/);
  assert.match(prototypes, /id: "prototype-order"/);
  assert.match(prototypes, /type: "order"/);
  assert.match(specs, /order: freezeSpec\(/);
  assert.match(app, /getPrototypeNode\(/);
  assert.match(app, /Preview local · thao tác thật, không ghi progress, mastery hoặc reward/);
  assert.match(css, /\.order-board\s*\{/);
  assert.match(css, /\.order-slot\.active/);
  assert.match(css, /\.order-token-bank/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
