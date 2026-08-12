import { normalizeProgress } from "../gameEngine.js";
import { normalizeQuestState } from "../questEngine.js";

export const GEMINI_SERVER_CONTRACT = Object.freeze({
  id: "gemini-server-oracle-v1",
  provider: "gemini",
  active: false,
  serverMediated: true,
  clientApiKeyAllowed: false,
  requestFields: Object.freeze(["nodeId", "skillId", "type", "hintLevel", "errorCode", "priorMastery", "supportPolicy"]),
  responseFields: Object.freeze(["schemaVersion", "text", "hintLevel", "safetyStatus", "curriculumBound"]),
});

export const FIREBASE_SYNC_CONTRACT = Object.freeze({
  id: "firebase-parent-progress-v1",
  provider: "firebase",
  active: false,
  authMode: "parent-owned",
  rulesVersion: "2",
  collectionPattern: "parents/{parentId}/children/{childId}",
  persistentWebCacheDefault: false,
  conflictStrategy: "compare-and-set",
});

const isText = (value) => typeof value === "string" && value.trim().length > 0;
const safeText = (value, max = 80) => isText(value) ? value.trim().slice(0, max) : undefined;
const clampInt = (value, min, max) => Number.isFinite(value) ? Math.min(max, Math.max(min, Math.trunc(value))) : min;

function isSafeServerEndpoint(value) {
  if (!isText(value)) return false;
  if (!value.startsWith("/api/")) return false;
  const parsed = new URL(value, "https://lumora.invalid");
  return parsed.origin === "https://lumora.invalid" && parsed.pathname.startsWith("/api/") && !parsed.search && !parsed.hash;
}

function hasClientSecret(config, depth = 0) {
  if (!config || typeof config !== "object" || depth > 3) return false;
  return Object.entries(config).some(([key, value]) => {
    if (/^(gemini|google)?_?api_?key$|clientApiKey/i.test(key) && isText(value)) return true;
    return value && typeof value === "object" && hasClientSecret(value, depth + 1);
  });
}

function auditGeminiConfig(gemini = {}) {
  const geminiBlockers = [];
  if (!isSafeServerEndpoint(gemini.serverEndpoint)) geminiBlockers.push("SERVER_ENDPOINT_REQUIRED");
  if (gemini.serverMediated !== true) geminiBlockers.push("SERVER_MEDIATION_REQUIRED");
  if (gemini.parentSessionRequired !== true) geminiBlockers.push("PARENT_SESSION_REQUIRED");
  if (!isText(gemini.responsePolicyVersion)) geminiBlockers.push("RESPONSE_POLICY_REQUIRED");
  if (hasClientSecret(gemini)) geminiBlockers.push("CLIENT_API_KEY_FORBIDDEN");
  return { ready: geminiBlockers.length === 0, blockers: geminiBlockers };
}

function auditFirebaseConfig(firebase = {}) {
  const firebaseBlockers = [];
  if (!isText(firebase.projectId)) firebaseBlockers.push("PROJECT_ID_REQUIRED");
  if (firebase.authMode !== "parent-owned") firebaseBlockers.push("PARENT_AUTH_REQUIRED");
  if (firebase.rulesVersion !== "2" || firebase.rulesDeployed !== true) firebaseBlockers.push("SECURITY_RULES_REQUIRED");
  if (firebase.collectionPattern !== FIREBASE_SYNC_CONTRACT.collectionPattern) firebaseBlockers.push("OWNER_PATH_REQUIRED");
  if (firebase.persistentWebCache === true && firebase.trustedDeviceConsent !== true) firebaseBlockers.push("TRUSTED_DEVICE_CONSENT_REQUIRED");
  const retentionDays = clampInt(firebase.retentionDays, 0, 10000);
  if (retentionDays < 1 || retentionDays > 365) firebaseBlockers.push("RETENTION_POLICY_REQUIRED");
  return { ready: firebaseBlockers.length === 0, blockers: firebaseBlockers };
}

export function auditCloudIntegrationConfig(config = {}) {
  const geminiConfig = config.gemini && typeof config.gemini === "object" ? config.gemini : {};
  const firebaseConfig = config.firebase && typeof config.firebase === "object" ? config.firebase : {};
  const gemini = auditGeminiConfig(geminiConfig);
  if (hasClientSecret(config) && !gemini.blockers.includes("CLIENT_API_KEY_FORBIDDEN")) {
    gemini.blockers.push("CLIENT_API_KEY_FORBIDDEN");
    gemini.ready = false;
  }
  const firebase = auditFirebaseConfig(firebaseConfig);

  return {
    ready: gemini.ready && firebase.ready,
    gemini,
    firebase,
  };
}

const allowlistedText = (value, allowedValues) => {
  const clean = safeText(value, 96);
  return clean && new Set(Array.isArray(allowedValues) ? allowedValues : []).has(clean) ? clean : undefined;
};

const hasRequestPolicy = (policy) => [policy?.allowedNodeIds, policy?.allowedSkillIds, policy?.allowedTypes]
  .every((values) => Array.isArray(values) && values.length > 0);

export function sanitizeOracleRequest(request = {}, policy = {}) {
  const value = request && typeof request === "object" ? request : {};
  return {
    schemaVersion: "1",
    nodeId: allowlistedText(value.nodeId, policy.allowedNodeIds),
    skillId: allowlistedText(value.skillId, policy.allowedSkillIds),
    type: allowlistedText(value.type, policy.allowedTypes),
    hintLevel: clampInt(value.hintLevel ?? value.level, 1, 3),
    errorCode: allowlistedText(value.errorCode, policy.allowedErrorCodes),
    priorMastery: clampInt(value.priorMastery, 0, 3),
    supportPolicy: allowlistedText(value.supportPolicy, policy.allowedSupportPolicies),
  };
}

function validateOracleResponse(value) {
  if (!value || typeof value !== "object") return null;
  if (value.schemaVersion !== "1" || value.safetyStatus !== "approved" || value.curriculumBound !== true) return null;
  if (!isText(value.text) || value.text.trim().length > 240) return null;
  return {
    type: "remote",
    level: clampInt(value.hintLevel, 1, 3),
    text: value.text.trim(),
    fallback: false,
    provider: GEMINI_SERVER_CONTRACT.id,
  };
}

export function createServerOracleProvider({ config = {}, requestPolicy = {}, fetchImpl = globalThis.fetch, timeoutMs = 3500 } = {}) {
  const readiness = auditGeminiConfig(config);
  if (!hasRequestPolicy(requestPolicy)) {
    readiness.blockers.push("REQUEST_POLICY_REQUIRED");
    readiness.ready = false;
  }
  const endpoint = config.serverEndpoint;
  const configured = readiness.ready && typeof fetchImpl === "function";
  async function getHint(request = {}) {
    if (!configured) return { ok: false, reason: "not-configured" };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), clampInt(timeoutMs, 250, 15000));
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sanitizeOracleRequest(request, requestPolicy)),
        signal: controller.signal,
      });
      if (!response?.ok || typeof response.json !== "function") return { ok: false, reason: `http-${response?.status ?? "error"}` };
      const hint = validateOracleResponse(await response.json());
      return hint ? { ok: true, hint } : { ok: false, reason: "invalid-response" };
    } catch (error) {
      return { ok: false, reason: error?.name === "AbortError" ? "timeout" : "network-error" };
    } finally {
      clearTimeout(timeout);
    }
  }
  return Object.freeze({
    descriptor: Object.freeze({ ...GEMINI_SERVER_CONTRACT, active: configured, endpointConfigured: isSafeServerEndpoint(endpoint), blockers: Object.freeze([...readiness.blockers]) }),
    getHint,
  });
}

export function createHybridOracleProvider({ localProvider, remoteProvider } = {}) {
  if (!localProvider || typeof localProvider.getHint !== "function") throw new TypeError("localProvider.getHint is required");
  async function getHint(request = {}) {
    if (remoteProvider && typeof remoteProvider.getHint === "function") {
      let remote;
      try {
        remote = await remoteProvider.getHint(request);
      } catch {
        remote = { ok: false, reason: "remote-exception" };
      }
      if (remote?.ok && remote.hint) return remote.hint;
      const local = localProvider.getHint({ type: request.type, level: request.hintLevel ?? request.level });
      return { ...local, provider: localProvider.descriptor?.id ?? "local", remoteFallbackReason: remote?.reason ?? "remote-unavailable" };
    }
    return { ...localProvider.getHint({ type: request.type, level: request.hintLevel ?? request.level }), provider: localProvider.descriptor?.id ?? "local" };
  }
  return Object.freeze({ descriptor: Object.freeze({ id: "hybrid-oracle-v1", remoteOptional: true }), getHint });
}

export function sanitizeProgressForCloud(progress, { validNodeIds = [], validSkillIds = [], validQuestIds = [], validWorldIds = [] } = {}) {
  const normalized = normalizeProgress(progress, validNodeIds);
  const nodeSet = new Set(validNodeIds);
  const skillSet = new Set(validSkillIds);
  const learningMetrics = Object.fromEntries(Object.entries(normalized.learningMetrics)
    .filter(([skillId]) => skillSet.has(skillId))
    .map(([skillId, metric]) => [skillId, { ...metric, skillId }]));
  const safeDate = (value) => {
    if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
    return new Date(value).toISOString();
  };
  const nodeOutcomes = Object.fromEntries(Object.entries(normalized.nodeOutcomes)
    .filter(([nodeId, outcome]) => nodeSet.has(nodeId) && skillSet.has(outcome.skillId))
    .map(([nodeId, outcome]) => [nodeId, { ...outcome, completedAt: safeDate(outcome.completedAt) }]));
  const activityHistory = normalized.activityHistory
    .filter((record) => nodeSet.has(record.nodeId) && skillSet.has(record.skillId));
  const payload = {
    completed: normalized.completed,
    shards: normalized.shards,
    xp: normalized.xp,
    energies: normalized.energies,
    nubiStage: normalized.nubiStage,
    lastPlayedAt: safeDate(normalized.lastPlayedAt),
    learningMetrics,
    nodeOutcomes,
    gameplayMetrics: normalized.gameplayMetrics,
    practiceMetrics: normalized.practiceMetrics,
    activityHistory,
    questState: normalizeQuestState(progress?.questState, validQuestIds),
  };
  if (validWorldIds.length > 0) {
    const worldSet = new Set(validWorldIds);
    const completedWorldIds = [...new Set(Array.isArray(progress?.campaignState?.completedWorldIds)
      ? progress.campaignState.completedWorldIds.filter((id) => typeof id === "string" && worldSet.has(id))
      : [])];
    payload.campaignState = {
      activeWorldId: typeof progress?.campaignState?.activeWorldId === "string" && worldSet.has(progress.campaignState.activeWorldId)
        ? progress.campaignState.activeWorldId
        : null,
      completedWorldIds,
    };
  }
  return payload;
}

const validOpaqueId = (value) => typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value);

export function createFirebaseProgressSyncContract({ config = {}, transport, validNodeIds = [], validSkillIds = [], validQuestIds = [], validWorldIds = [], clock = () => new Date().toISOString() } = {}) {
  const readiness = auditFirebaseConfig(config);
  const configured = readiness.ready && transport && typeof transport.read === "function" && typeof transport.compareAndSet === "function";
  async function sync({ parentId, childId, progress, revision = 0 } = {}) {
    if (!configured) return { status: "disabled", ok: false, reason: "transport-not-configured" };
    if (!validOpaqueId(parentId) || !validOpaqueId(childId)) return { status: "error", ok: false, reason: "invalid-owner-path" };
    const expectedRevision = clampInt(revision, 0, Number.MAX_SAFE_INTEGER);
    const path = `parents/${parentId}/children/${childId}`;
    let current;
    try {
      current = await transport.read(path);
    } catch {
      return { status: "error", ok: false, reason: "read-failed" };
    }
    const remoteRevision = clampInt(current?.revision, 0, Number.MAX_SAFE_INTEGER);
    if (remoteRevision > expectedRevision) return { status: "conflict", ok: false, reason: "remote-newer", remote: structuredClone(current) };
    const document = {
      schemaVersion: 1,
      revision: expectedRevision + 1,
      updatedAt: clock(),
      progress: sanitizeProgressForCloud(progress, { validNodeIds, validSkillIds, validQuestIds, validWorldIds }),
    };
    let written;
    try {
      written = await transport.compareAndSet(path, expectedRevision, structuredClone(document));
    } catch {
      return { status: "error", ok: false, reason: "write-failed" };
    }
    if (!written?.ok) return { status: "conflict", ok: false, reason: written?.reason ?? "compare-and-set-failed", remote: structuredClone(written?.current ?? current ?? null) };
    return { status: "synced", ok: true, path, revision: document.revision, document: structuredClone(document) };
  }
  return Object.freeze({ descriptor: Object.freeze({ ...FIREBASE_SYNC_CONTRACT, active: Boolean(configured), blockers: Object.freeze([...readiness.blockers]) }), sync });
}
