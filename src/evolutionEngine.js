const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function validStages(stages) {
  if (!Array.isArray(stages)) return [];
  return stages
    .filter((stage) => isRecord(stage) && Number.isInteger(stage.stage) && stage.stage > 0 && typeof stage.id === "string" && typeof stage.sprite === "string")
    .sort((a, b) => a.stage - b.stage);
}

export function getNubiEvolutionStage(progress, stages = []) {
  const registry = validStages(stages);
  if (!registry.length) return null;
  const requested = Number.isFinite(progress?.nubiStage) ? Math.trunc(progress.nubiStage) : registry[0].stage;
  return registry.filter((stage) => stage.stage <= requested).at(-1) ?? registry[0];
}

export function getNubiEvolutionTransition({ nodeId, firstClear, beforeProgress, afterProgress } = {}, stages = []) {
  if (nodeId !== "boss" || firstClear !== true) return null;
  const from = getNubiEvolutionStage(beforeProgress, stages);
  const to = getNubiEvolutionStage(afterProgress, stages);
  if (!from || !to || to.stage <= from.stage) return null;
  return Object.freeze({ from, to });
}
