// Privacy-safe League demo. This is a deterministic local showcase, not a
// network leaderboard. Fictional peers make the feature testable without
// pretending Firebase or real child accounts exist.

export const LEAGUE_DEMO_PROVIDER = Object.freeze({
  id: "local-fictional-league",
  kind: "league",
  name: "Liên Minh Mầm Sáng — local demo",
  local: true,
  remote: false,
  syncsToFirebase: false,
  realPlayers: false,
  fictionalPeers: true,
  rankingBasis: "unique-completion-and-best-mastery",
  note: "Fictional anonymous peers. No child data leaves this browser.",
});

const TIERS = Object.freeze([
  Object.freeze({ id: "mam-sang", name: "Mầm Sáng", icon: "✦", minScore: 0 }),
  Object.freeze({ id: "tan-la", name: "Tán Lá", icon: "❧", minScore: 93 }),
  Object.freeze({ id: "cau-vong", name: "Cầu Vồng", icon: "⌁", minScore: 186 }),
  Object.freeze({ id: "tinh-van", name: "Tinh Vân", icon: "✺", minScore: 279 }),
]);

const FICTIONAL_PEERS = Object.freeze([
  Object.freeze({ id: "demo-tia-lam", alias: "Tia Lam", score: 320, icon: "◈" }),
  Object.freeze({ id: "demo-mam-xanh", alias: "Mầm Xanh", score: 245, icon: "✦" }),
  Object.freeze({ id: "demo-sao-nho", alias: "Sao Nhỏ", score: 165, icon: "✧" }),
  Object.freeze({ id: "demo-hat-mua", alias: "Hạt Mưa", score: 90, icon: "◇" }),
]);

const clampInt = (value, min, max) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, Math.trunc(value))) : min;

export function sanitizeLeagueAlias(value) {
  if (typeof value !== "string") return "Nhà Thám Hiểm";
  const alias = value.replace(/[\u0000-\u001f\u007f]/g, "").trim().replace(/\s+/g, " ").slice(0, 16);
  return alias.length >= 2 ? alias : "Nhà Thám Hiểm";
}

/**
 * Score = 1 point for each unique completed node + 10 × best mastery (0–3).
 * Shards, elapsed time, actions, attempts and replays are deliberately ignored.
 */
export function calculateLeagueScore(progress, { validNodes = [] } = {}) {
  if (!progress || typeof progress !== "object") return 0;
  const canonicalNodes = Array.isArray(validNodes)
    ? validNodes.filter((node) => node && typeof node.id === "string").slice(0, 100)
    : [];
  if (canonicalNodes.length === 0) return 0;
  const canonicalById = new Map(canonicalNodes.map((node) => [node.id, node]));
  const completed = Array.isArray(progress.completed)
    ? [...new Set(progress.completed.filter((id) => canonicalById.has(id)))]
    : [];
  const metrics = progress.learningMetrics && typeof progress.learningMetrics === "object"
    ? progress.learningMetrics
    : {};
  const outcomes = progress.nodeOutcomes && typeof progress.nodeOutcomes === "object"
    ? progress.nodeOutcomes
    : {};

  return completed.reduce((score, nodeId) => {
    const canonicalSkillId = canonicalById.get(nodeId)?.skillId;
    const skillId = typeof canonicalSkillId === "string"
      ? canonicalSkillId
      : typeof outcomes[nodeId]?.skillId === "string" ? outcomes[nodeId].skillId : nodeId;
    const mastery = clampInt(metrics[skillId]?.bestMastery ?? metrics[nodeId]?.bestMastery, 0, 3);
    return score + 1 + mastery * 10;
  }, 0);
}

function getTier(score) {
  return [...TIERS].reverse().find((tier) => score >= tier.minScore) ?? TIERS[0];
}

export function buildLeagueSnapshot(progress, { alias, validNodes = [] } = {}) {
  const totalNodes = Math.max(1, Math.min(100, Array.isArray(validNodes) ? validNodes.length : 0));
  const score = calculateLeagueScore(progress, { validNodes });
  const tierIndex = TIERS.findIndex((tier) => tier.id === getTier(score).id);
  const tier = TIERS[tierIndex];
  const nextTier = TIERS[tierIndex + 1] ?? null;
  const lower = tier.minScore;
  const upper = nextTier?.minScore ?? clampInt(totalNodes, 1, 100) * 31;
  const tierProgress = nextTier
    ? Math.round(((score - lower) / Math.max(1, upper - lower)) * 100)
    : 100;
  const user = {
    id: "local-player",
    alias: sanitizeLeagueAlias(alias),
    icon: "◆",
    score,
    isUser: true,
    fictional: false,
  };
  const standings = [...FICTIONAL_PEERS.map((peer) => ({ ...peer, isUser: false, fictional: true })), user]
    .sort((a, b) => b.score - a.score || Number(b.isUser) - Number(a.isUser) || a.id.localeCompare(b.id))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return {
    descriptor: LEAGUE_DEMO_PROVIDER,
    tier: { ...tier },
    nextTier: nextTier ? { ...nextTier } : null,
    tierProgress: clampInt(tierProgress, 0, 100),
    score,
    maxScore: clampInt(totalNodes, 1, 100) * 31,
    userRank: standings.find((entry) => entry.isUser)?.rank ?? standings.length,
    standings,
    scoring: Object.freeze({ uniqueCompletion: 1, bestMastery: 10, replay: 0, shards: 0, timeOnline: 0 }),
    rewards: Object.freeze({ shards: 0, power: 0, cosmeticOnly: true }),
  };
}
