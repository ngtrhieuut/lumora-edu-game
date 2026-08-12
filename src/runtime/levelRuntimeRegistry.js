import { getMechanicDefinition, MECHANIC_REGISTRY } from "../levelCatalog/mechanicRegistry.js";

// Renderer ids are mechanic-family ids, not level ids. New catalog levels can
// therefore reuse a renderer without adding a React branch for every level.
const RUNTIME_RENDERER_BY_MECHANIC = Object.freeze({
  collect: "collect",
  "slot-fill": "slot-fill",
  sort: "sort",
  path: "path",
  "build-repair": "build-repair",
  simulation: "simulation",
  match: "match",
  sequence: "sequence",
  observation: "observation",
  "resource-balance": "resource-balance",
  lab: "lab",
  data: "data",
  boss: "boss",
});

const FALLBACK_RENDERER = Object.freeze({
  mechanicId: null,
  rendererId: "fallback",
  supported: false,
  status: "unsupported",
  reason: "unknown-mechanic",
});

export function getRendererForMechanic(mechanicId) {
  const definition = getMechanicDefinition(mechanicId);
  if (!definition) return FALLBACK_RENDERER;
  const rendererId = RUNTIME_RENDERER_BY_MECHANIC[mechanicId];
  if (!rendererId) return Object.freeze({ mechanicId, rendererId: "fallback", supported: false, status: definition.status, reason: "renderer-missing" });
  return Object.freeze({
    mechanicId,
    rendererId,
    supported: true,
    status: definition.status,
    prototypeRuntimeId: definition.prototypeRuntimeId ?? null,
  });
}

export function auditRuntimeRendererRegistry() {
  const errors = [];
  for (const mechanicId of Object.keys(MECHANIC_REGISTRY)) {
    const renderer = getRendererForMechanic(mechanicId);
    if (!renderer.supported) errors.push(`${mechanicId}: renderer unavailable`);
  }
  return { valid: errors.length === 0, errors };
}

export { RUNTIME_RENDERER_BY_MECHANIC };
