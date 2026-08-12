const DEFAULT_PORTION_IDS = Object.freeze([0, 1, 2, 3, 4]);
const DEFAULT_GROUPS = Object.freeze({ miu: 2, ti: 3 });
const SCENARIO_FRIENDS = Object.freeze(Object.keys(DEFAULT_GROUPS));

function normalizePortionIds(value) {
  if (!Array.isArray(value)) return [...DEFAULT_PORTION_IDS];
  const ids = [...new Set(value.filter((id) => Number.isInteger(id) && id >= 0))];
  return ids.length ? ids : [...DEFAULT_PORTION_IDS];
}

function normalizeGroups(value) {
  return Object.fromEntries(SCENARIO_FRIENDS.map((friend) => {
    const amount = Number.isFinite(value?.[friend]) ? Math.trunc(value[friend]) : DEFAULT_GROUPS[friend];
    return [friend, Math.max(0, amount)];
  }));
}

export function createScenarioState(options = {}) {
  const safeOptions = options && typeof options === "object" ? options : {};
  const portionIds = normalizePortionIds(safeOptions.portionIds);
  const groups = normalizeGroups(safeOptions.groups);
  const complete = SCENARIO_FRIENDS.every((friend) => groups[friend] === 0);
  return {
    portionIds,
    groups,
    servedByFriend: { miu: [], ti: [] },
    complete,
  };
}

export function normalizeScenarioState(value, options = {}) {
  const safeOptions = options && typeof options === "object" ? options : {};
  const base = createScenarioState({
    portionIds: value?.portionIds ?? safeOptions.portionIds,
    groups: value?.groups ?? safeOptions.groups,
  });
  const validPortions = new Set(base.portionIds);
  const usedPortions = new Set();
  const servedByFriend = {};
  for (const friend of SCENARIO_FRIENDS) {
    const raw = Array.isArray(value?.servedByFriend?.[friend]) ? value.servedByFriend[friend] : [];
    servedByFriend[friend] = [...new Set(raw.filter((portionId) => validPortions.has(portionId) && !usedPortions.has(portionId)))].slice(0, base.groups[friend]);
    servedByFriend[friend].forEach((portionId) => usedPortions.add(portionId));
  }
  const complete = SCENARIO_FRIENDS.every((friend) => servedByFriend[friend].length >= base.groups[friend]);
  return { ...base, servedByFriend, complete };
}

export function getNextScenarioPortion(state, friend) {
  const normalized = normalizeScenarioState(state);
  if (!SCENARIO_FRIENDS.includes(friend) || normalized.servedByFriend[friend].length >= normalized.groups[friend]) return null;
  const used = new Set(Object.values(normalized.servedByFriend).flat());
  return normalized.portionIds.find((portionId) => !used.has(portionId)) ?? null;
}

export function serveScenarioPortion(state, friend, portionId) {
  const normalized = normalizeScenarioState(state);
  if (!SCENARIO_FRIENDS.includes(friend)) {
    return { accepted: false, reason: "invalid-friend", state: normalized, complete: normalized.complete };
  }
  if (!normalized.portionIds.includes(portionId)) {
    return { accepted: false, reason: "invalid-portion", state: normalized, complete: normalized.complete };
  }
  if (normalized.complete) {
    return { accepted: false, reason: "complete", state: normalized, complete: true };
  }
  if (Object.values(normalized.servedByFriend).some((portions) => portions.includes(portionId))) {
    return { accepted: false, reason: "already-served", state: normalized, complete: false };
  }
  if (normalized.servedByFriend[friend].length >= normalized.groups[friend]) {
    return { accepted: false, reason: "full", state: normalized, complete: false };
  }
  const next = normalizeScenarioState({
    ...normalized,
    servedByFriend: {
      ...normalized.servedByFriend,
      [friend]: [...normalized.servedByFriend[friend], portionId],
    },
  });
  return { accepted: true, reason: "served", state: next, complete: next.complete };
}
