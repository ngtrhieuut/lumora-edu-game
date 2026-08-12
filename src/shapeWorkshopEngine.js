const DEFAULT_SHAPE_IDS = Object.freeze(["circle", "triangle", "square"]);

function normalizeShapeIds(value) {
  if (!Array.isArray(value)) return [...DEFAULT_SHAPE_IDS];
  const ids = [...new Set(value.filter((shape) => typeof shape === "string" && DEFAULT_SHAPE_IDS.includes(shape)))];
  return ids.length ? ids : [...DEFAULT_SHAPE_IDS];
}

export function createShapeWorkshopState(options = {}) {
  const safeOptions = options && typeof options === "object" ? options : {};
  const shapeIds = normalizeShapeIds(safeOptions.shapeIds);
  return {
    shapeIds,
    placedShapeIds: [],
    poweredModules: 0,
    complete: shapeIds.length === 0,
  };
}

export function normalizeShapeWorkshopState(value, options = {}) {
  const safeOptions = options && typeof options === "object" ? options : {};
  const base = createShapeWorkshopState({
    shapeIds: value?.shapeIds ?? safeOptions.shapeIds,
  });
  const validIds = new Set(base.shapeIds);
  const placedShapeIds = Array.isArray(value?.placedShapeIds)
    ? [...new Set(value.placedShapeIds.filter((shape) => validIds.has(shape)))]
    : [];
  const poweredModules = Math.min(base.shapeIds.length, placedShapeIds.length);
  return {
    ...base,
    placedShapeIds,
    poweredModules,
    complete: poweredModules >= base.shapeIds.length,
  };
}

export function getNextShape(state) {
  const normalized = normalizeShapeWorkshopState(state);
  return normalized.shapeIds.find((shape) => !normalized.placedShapeIds.includes(shape)) ?? null;
}

export function placeShape(state, shapeId) {
  const normalized = normalizeShapeWorkshopState(state);
  if (!normalized.shapeIds.includes(shapeId)) {
    return { accepted: false, reason: "invalid-shape", state: normalized, complete: normalized.complete };
  }
  if (normalized.complete) {
    return { accepted: false, reason: "complete", state: normalized, complete: true };
  }
  if (normalized.placedShapeIds.includes(shapeId)) {
    return { accepted: false, reason: "already-placed", state: normalized, complete: false };
  }
  const next = normalizeShapeWorkshopState({
    ...normalized,
    placedShapeIds: [...normalized.placedShapeIds, shapeId],
  });
  return { accepted: true, reason: "placed", state: next, complete: next.complete };
}
