import assert from "node:assert/strict";
import { test } from "node:test";
import { getNubiEvolutionStage, getNubiEvolutionTransition } from "./evolutionEngine.js";

const STAGES = [
  { stage: 1, id: "seed", sprite: "/seed.png" },
  { stage: 2, id: "guide", sprite: "/guide.png" },
];

test("evolution stage lookup clamps malformed and future progress to the registry", () => {
  assert.equal(getNubiEvolutionStage(null, STAGES).id, "seed");
  assert.equal(getNubiEvolutionStage({ nubiStage: -4 }, STAGES).id, "seed");
  assert.equal(getNubiEvolutionStage({ nubiStage: 2 }, STAGES).id, "guide");
  assert.equal(getNubiEvolutionStage({ nubiStage: 99 }, STAGES).id, "guide");
  assert.equal(getNubiEvolutionStage({ nubiStage: 2 }, []), null);
});

test("only a first boss clear that advances stage creates an evolution transition", () => {
  const transition = getNubiEvolutionTransition({ nodeId: "boss", firstClear: true, beforeProgress: { nubiStage: 1 }, afterProgress: { nubiStage: 2 } }, STAGES);
  assert.equal(transition.from.id, "seed");
  assert.equal(transition.to.id, "guide");
  assert.equal(getNubiEvolutionTransition({ nodeId: "boss", firstClear: false, beforeProgress: { nubiStage: 2 }, afterProgress: { nubiStage: 2 } }, STAGES), null);
  assert.equal(getNubiEvolutionTransition({ nodeId: "collect", firstClear: true, beforeProgress: { nubiStage: 1 }, afterProgress: { nubiStage: 2 } }, STAGES), null);
  assert.equal(getNubiEvolutionTransition({ nodeId: "boss", firstClear: true, beforeProgress: { nubiStage: 2 }, afterProgress: { nubiStage: 2 } }, STAGES), null);
});
