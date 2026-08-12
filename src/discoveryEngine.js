// Local-only Daily Adventure discovery activity.
// It reinforces the route the child just practiced without adding curriculum,
// mastery, shards, pressure, or an external data dependency.

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isValidId = (value) => typeof value === "string" && value.trim().length > 0;
const DISCOVERY_ACCENTS = ["gold", "blue", "green"];

function dateOffset(dateKey, length) {
  if (length <= 0 || typeof dateKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return 0;
  const sum = [...dateKey].reduce((total, character) => total + (Number.isInteger(Number(character)) ? Number(character) : 0), 0);
  return sum % length;
}

function rotate(items, offset) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const safeOffset = ((offset % items.length) + items.length) % items.length;
  return items.slice(safeOffset).concat(items.slice(0, safeOffset));
}

function normalizePlaced(placed) {
  if (!Array.isArray(placed)) return [];
  const seenSlots = new Set();
  const seenFragments = new Set();
  return placed.filter((entry) => {
    if (!isRecord(entry) || !isValidId(entry.slotId) || !isValidId(entry.fragmentId)) return false;
    if (seenSlots.has(entry.slotId) || seenFragments.has(entry.fragmentId)) return false;
    seenSlots.add(entry.slotId);
    seenFragments.add(entry.fragmentId);
    return true;
  }).map((entry) => ({ slotId: entry.slotId, fragmentId: entry.fragmentId }));
}

/**
 * Build a deterministic, local discovery route from up to three challenges just
 * practiced. The source cards are rotated by date, while the correct route
 * remains the selected practice queue order.
 */
export function buildDiscoveryChallenge(queue, nodeDefinitions, options = {}) {
  if (!Array.isArray(queue) || !Array.isArray(nodeDefinitions)) return null;

  const nodesById = new Map(nodeDefinitions.filter((node) => isRecord(node) && isValidId(node.id)).map((node) => [node.id, node]));
  const seen = new Set();
  const selected = queue
    .filter((id) => isValidId(id))
    .map((id) => id.trim())
    .filter((id) => {
      if (seen.has(id) || !nodesById.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, 3)
    .map((id, index) => {
      const node = nodesById.get(id);
      return {
        id: `fragment-${id}`,
        sourceNodeId: id,
        label: isValidId(node.shortTitle) ? node.shortTitle : node.title ?? id,
        icon: typeof node.icon === "string" && node.icon ? node.icon : "✦",
        accent: DISCOVERY_ACCENTS[index % DISCOVERY_ACCENTS.length],
        slotId: `slot-${index}`,
        order: index + 1,
      };
    });

  if (selected.length === 0) return null;

  const offset = dateOffset(options?.dateKey, selected.length);
  return {
    id: `discovery-${selected.map((fragment) => fragment.sourceNodeId).join("-")}`,
    title: "Mạch Ký Ức",
    prompt: `Kéo ${selected.length} dấu sáng theo đúng hành trình con vừa luyện.`,
    fragments: rotate(selected, offset),
    slots: selected.map((fragment, index) => ({
      id: fragment.slotId,
      label: `Mạch ${index + 1}`,
      expectedFragmentId: fragment.id,
      accent: fragment.accent,
    })),
  };
}

/** Apply one click or drag placement without mutating the prior state. */
export function placeDiscoveryFragment(placed, challenge, slotId, fragmentId) {
  const current = normalizePlaced(placed);
  if (!isRecord(challenge) || !Array.isArray(challenge.slots) || !Array.isArray(challenge.fragments)) {
    return { placed: current, accepted: false, complete: false, reason: "invalid-challenge" };
  }

  const slot = challenge.slots.find((candidate) => candidate?.id === slotId);
  const fragment = challenge.fragments.find((candidate) => candidate?.id === fragmentId);
  if (!slot || !fragment) return { placed: current, accepted: false, complete: false, reason: "unknown-piece" };
  if (current.some((entry) => entry.slotId === slot.id || entry.fragmentId === fragment.id)) {
    return { placed: current, accepted: false, complete: false, reason: "already-placed" };
  }
  if (slot.expectedFragmentId !== fragment.id) {
    return { placed: current, accepted: false, complete: false, reason: "wrong-slot" };
  }

  const next = [...current, { slotId: slot.id, fragmentId: fragment.id }];
  return {
    placed: next,
    accepted: true,
    complete: next.length === challenge.slots.length,
    reason: next.length === challenge.slots.length ? "complete" : "placed",
  };
}

export function isDiscoveryComplete(placed, challenge) {
  if (!isRecord(challenge) || !Array.isArray(challenge.slots) || challenge.slots.length === 0) return false;
  const current = normalizePlaced(placed);
  return current.length === challenge.slots.length && challenge.slots.every((slot) => current.some((entry) => entry.slotId === slot.id && entry.fragmentId === slot.expectedFragmentId));
}
