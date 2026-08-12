import assert from "node:assert/strict";
import test from "node:test";
import {
  createOrderState,
  getNextOrderItem,
  getOrderAvailableSlotIds,
  getOrderProgress,
  normalizeOrderState,
  placeOrderItem,
} from "./orderEngine.js";

test("ordering prototype starts with an empty bounded sequence", () => {
  const state = createOrderState({ itemIds: ["one", "two", "three"] });
  assert.deepEqual(state, {
    itemIds: ["one", "two", "three"],
    placements: [],
    nextIndex: 0,
    mistakes: 0,
    complete: false,
  });
  assert.equal(getNextOrderItem(state), "one");
  assert.deepEqual(getOrderAvailableSlotIds(state), ["0", "1", "2"]);
});

test("wrong item or slot soft-fails without changing accepted placements", () => {
  const start = createOrderState({ itemIds: ["one", "two", "three"] });
  const wrongItem = placeOrderItem(start, "two", 0);
  const wrongSlot = placeOrderItem(start, "one", 1);

  assert.equal(wrongItem.accepted, false);
  assert.equal(wrongItem.reason, "wrong-order");
  assert.deepEqual(wrongItem.state.placements, []);
  assert.equal(wrongItem.state.mistakes, 1);
  assert.equal(wrongSlot.reason, "wrong-order");
  assert.deepEqual(wrongSlot.state.placements, []);
});

test("correct placements complete in sequence and preserve prior state", () => {
  const first = placeOrderItem(createOrderState({ itemIds: ["one", "two", "three"] }), "one", 0);
  const second = placeOrderItem(first.state, "two", 1);
  const third = placeOrderItem(second.state, "three", 2);

  assert.equal(first.accepted, true);
  assert.equal(second.accepted, true);
  assert.equal(third.accepted, true);
  assert.equal(third.complete, true);
  assert.deepEqual(third.state.placements, [
    { itemId: "one", slotIndex: 0 },
    { itemId: "two", slotIndex: 1 },
    { itemId: "three", slotIndex: 2 },
  ]);
  assert.deepEqual(getOrderProgress(third.state), { placed: 3, total: 3, nextIndex: 3, mistakes: 0, complete: true });
});

test("normalization rejects duplicate and out-of-range placements", () => {
  const state = normalizeOrderState({
    itemIds: ["one", "two"],
    placements: [
      { itemId: "one", slotIndex: 0 },
      { itemId: "one", slotIndex: 1 },
      { itemId: "unknown", slotIndex: 1 },
      { itemId: "two", slotIndex: 8 },
    ],
  });

  assert.deepEqual(state.placements, [{ itemId: "one", slotIndex: 0 }]);
  assert.equal(state.nextIndex, 1);
  assert.equal(state.complete, false);
});
