// Bounded ordering prototype. It is intentionally separate from the canonical
// curriculum registry until an official learning objective is reviewed.

const DEFAULT_ITEM_IDS = Object.freeze(["first", "second", "third"]);

function normalizeItemIds(value) {
  if (!Array.isArray(value)) return [...DEFAULT_ITEM_IDS];
  const ids = [...new Set(value.filter((id) => typeof id === "string" && id.trim().length > 0).map((id) => id.trim()))];
  return ids.length > 0 ? ids : [...DEFAULT_ITEM_IDS];
}

function normalizeSlotIndex(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function normalizePlacements(value, itemIds) {
  if (!Array.isArray(value)) return [];
  const validItems = new Set(itemIds);
  const placements = [];
  const usedItems = new Set();
  const usedSlots = new Set();
  for (const entry of value) {
    const itemId = typeof entry?.itemId === "string" ? entry.itemId : null;
    const slotIndex = normalizeSlotIndex(entry?.slotIndex);
    if (!itemId || !validItems.has(itemId) || slotIndex === null || slotIndex >= itemIds.length) continue;
    if (usedItems.has(itemId) || usedSlots.has(slotIndex)) continue;
    usedItems.add(itemId);
    usedSlots.add(slotIndex);
    placements.push({ itemId, slotIndex });
  }
  return placements;
}

function getNextIndex(itemIds, placements) {
  const usedSlots = new Set(placements.map((entry) => entry.slotIndex));
  return itemIds.findIndex((_, index) => !usedSlots.has(index));
}

export function createOrderState(options = {}) {
  const itemIds = normalizeItemIds(options?.itemIds);
  return {
    itemIds,
    placements: [],
    nextIndex: 0,
    mistakes: 0,
    complete: itemIds.length === 0,
  };
}

export function normalizeOrderState(value, options = {}) {
  const base = createOrderState({ itemIds: value?.itemIds ?? options?.itemIds });
  const placements = normalizePlacements(value?.placements, base.itemIds);
  const nextIndex = getNextIndex(base.itemIds, placements);
  const mistakes = Number.isInteger(value?.mistakes) && value.mistakes >= 0 ? value.mistakes : 0;
  return {
    ...base,
    placements,
    nextIndex: nextIndex === -1 ? base.itemIds.length : nextIndex,
    mistakes,
    complete: placements.length >= base.itemIds.length,
  };
}

export function getNextOrderItem(state) {
  const normalized = normalizeOrderState(state);
  return normalized.itemIds[normalized.nextIndex] ?? null;
}

export function getOrderAvailableSlotIds(state) {
  const normalized = normalizeOrderState(state);
  const occupied = new Set(normalized.placements.map((entry) => entry.slotIndex));
  return normalized.itemIds.map((_, index) => String(index)).filter((index) => !occupied.has(Number(index)));
}

export function getOrderProgress(state) {
  const normalized = normalizeOrderState(state);
  return {
    placed: normalized.placements.length,
    total: normalized.itemIds.length,
    nextIndex: normalized.nextIndex,
    mistakes: normalized.mistakes,
    complete: normalized.complete,
  };
}

export function placeOrderItem(state, itemId, slotIndex) {
  const normalized = normalizeOrderState(state);
  const safeSlotIndex = normalizeSlotIndex(slotIndex);
  if (normalized.complete) return { accepted: false, reason: "complete", state: normalized, complete: true };
  if (!normalized.itemIds.includes(itemId)) return { accepted: false, reason: "invalid-item", state: normalized, complete: false };
  if (safeSlotIndex === null || safeSlotIndex >= normalized.itemIds.length) {
    return { accepted: false, reason: "invalid-slot", state: normalized, complete: false };
  }
  if (normalized.placements.some((entry) => entry.slotIndex === safeSlotIndex)) {
    return { accepted: false, reason: "occupied-slot", state: normalized, complete: false };
  }
  if (normalized.placements.some((entry) => entry.itemId === itemId)) {
    return { accepted: false, reason: "already-placed", state: normalized, complete: false };
  }
  const expectedItemId = getNextOrderItem(normalized);
  if (safeSlotIndex !== normalized.nextIndex || itemId !== expectedItemId) {
    const next = { ...normalized, mistakes: normalized.mistakes + 1 };
    return { accepted: false, reason: "wrong-order", state: next, complete: false };
  }
  const placements = [...normalized.placements, { itemId, slotIndex: safeSlotIndex }];
  const nextIndex = getNextIndex(normalized.itemIds, placements);
  const next = {
    ...normalized,
    placements,
    nextIndex: nextIndex === -1 ? normalized.itemIds.length : nextIndex,
    complete: placements.length >= normalized.itemIds.length,
  };
  return { accepted: true, reason: "placed", state: next, complete: next.complete };
}
