const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const clampInt = (value, min, max) => Math.min(max, Math.max(min, Math.trunc(finite(value, min))));

const toTime = (value) => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
};

export function getActivityWindow(progress, { now = Date.now(), days = 7 } = {}) {
  const upper = toTime(now);
  if (!Number.isFinite(upper)) return [];
  const windowDays = Math.max(1, clampInt(days, 1, 3660));
  const lower = upper - windowDays * 24 * 60 * 60 * 1000;
  const history = Array.isArray(progress?.activityHistory) ? progress.activityHistory : [];
  return history
    .filter((record) => record && typeof record === "object")
    .map((record) => ({ record, time: toTime(record.completedAt) }))
    .filter(({ time }) => Number.isFinite(time) && time >= lower && time <= upper)
    .sort((left, right) => left.time - right.time)
    .map(({ record }) => ({ ...record }));
}

export function summarizeLearningActivity(progress, options = {}) {
  const records = getActivityWindow(progress, options);
  const skills = new Set();
  let totalSeconds = 0;
  let independentSessions = 0;
  let supportedSessions = 0;
  let firstClears = 0;
  for (const record of records) {
    totalSeconds += clampInt(record.durationSeconds, 0, 4 * 60 * 60);
    if (typeof record.skillId === "string" && record.skillId) skills.add(record.skillId);
    if (clampInt(record.supportsUsed, 0, Infinity) > 0 || record.guided) supportedSessions += 1;
    else independentSessions += 1;
    if (record.firstClear) firstClears += 1;
  }
  return {
    totalSeconds,
    totalMinutesRounded: totalSeconds === 0 ? 0 : Math.max(1, Math.round(totalSeconds / 60)),
    sessions: records.length,
    uniqueSkills: skills.size,
    independentSessions,
    supportedSessions,
    firstClears,
  };
}

export function getLatestLearningProof(progress, nodeDefinitions, options = {}) {
  const definitions = new Map(
    (Array.isArray(nodeDefinitions) ? nodeDefinitions : [])
      .filter((node) => node && typeof node === "object" && typeof node.id === "string")
      .map((node) => [node.id, node]),
  );
  const records = getActivityWindow(progress, { ...options, days: options.days ?? 3660 });
  const record = records.slice().reverse().find((entry) => definitions.has(entry.nodeId));
  if (!record) return null;

  const node = definitions.get(record.nodeId);
  const outcome = progress?.nodeOutcomes?.[record.nodeId];
  return {
    nodeId: node.id,
    icon: typeof node.icon === "string" ? node.icon : "✦",
    title: typeof node.title === "string" ? node.title : node.id,
    skillId: typeof node.skillId === "string" ? node.skillId : node.id,
    skillNameVi: typeof node.skillNameVi === "string" ? node.skillNameVi : node.id,
    objectiveVi: typeof node.objectiveVi === "string" ? node.objectiveVi : "Mục tiêu chưa có mô tả.",
    mastery: clampInt(record.mastery ?? outcome?.mastery, 1, 3),
    attempts: clampInt(record.attempts ?? outcome?.attempts, 1, Infinity),
    supportsUsed: clampInt(record.supportsUsed ?? outcome?.supportsUsed, 0, Infinity),
    durationSeconds: clampInt(record.durationSeconds ?? 0, 0, 4 * 60 * 60),
    firstClear: Boolean(record.firstClear),
    mode: typeof record.mode === "string" ? record.mode : "adventure",
    completedAt: typeof record.completedAt === "string" ? record.completedAt : outcome?.completedAt ?? null,
  };
}

function skillRows(progress, nodeDefinitions) {
  const metrics = progress?.learningMetrics && typeof progress.learningMetrics === "object" ? progress.learningMetrics : {};
  const seen = new Set();
  const rows = [];
  for (const node of Array.isArray(nodeDefinitions) ? nodeDefinitions : []) {
    if (!node || typeof node !== "object") continue;
    const skillId = typeof node.skillId === "string" ? node.skillId : node.id;
    if (typeof skillId !== "string" || seen.has(skillId)) continue;
    const metric = metrics[skillId] ?? metrics[node.id];
    if (!metric || typeof metric !== "object") continue;
    seen.add(skillId);
    const attempts = clampInt(metric.totalAttempts, 0, Infinity);
    const supportsUsed = clampInt(metric.supportsUsed, 0, Infinity);
    rows.push({
      nodeId: node.id,
      skillId,
      title: node.title,
      skillNameVi: node.skillNameVi,
      mastery: clampInt(metric.bestMastery, 0, 3),
      attempts,
      supportsUsed,
      supportRate: supportsUsed / Math.max(1, attempts),
    });
  }
  return rows;
}

export function rankSkillInsights(progress, nodeDefinitions) {
  const rows = skillRows(progress, nodeDefinitions);
  if (!rows.length) return { strongest: null, practice: null };
  const strongest = rows.slice().sort((a, b) => b.mastery - a.mastery || a.supportRate - b.supportRate || b.attempts - a.attempts)[0];
  const practicePool = rows.length > 1 ? rows.filter((row) => row.skillId !== strongest.skillId) : rows;
  const practice = practicePool.slice().sort((a, b) => a.mastery - b.mastery || b.supportRate - a.supportRate || b.attempts - a.attempts)[0];
  return { strongest: { ...strongest }, practice: { ...practice } };
}

const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

export function getMasteryTrend(progress, skillId, options = {}) {
  if (typeof skillId !== "string" || !skillId) return { direction: "none", delta: 0, recentMastery: 0, priorMastery: 0, samples: 0 };
  const values = getActivityWindow(progress, { ...options, days: options.days ?? 30 })
    .filter((record) => record.skillId === skillId)
    .map((record) => clampInt(record.mastery, 1, 3));
  if (!values.length) return { direction: "none", delta: 0, recentMastery: 0, priorMastery: 0, samples: 0 };
  if (values.length === 1) return { direction: "new", delta: 0, recentMastery: values[0], priorMastery: 0, samples: 1 };
  const midpoint = Math.floor(values.length / 2);
  const priorMastery = average(values.slice(0, midpoint));
  const recentMastery = average(values.slice(midpoint));
  const delta = Math.round((recentMastery - priorMastery) * 100) / 100;
  return { direction: delta > 0 ? "up" : delta < 0 ? "down" : "steady", delta, recentMastery, priorMastery, samples: values.length };
}
