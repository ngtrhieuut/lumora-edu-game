import assert from "node:assert/strict";
import { test } from "node:test";

import { createRuleBasedOracleProvider } from "./services/oracleProvider.js";
import {
  auditCloudIntegrationConfig,
  createFirebaseProgressSyncContract,
  createHybridOracleProvider,
  createServerOracleProvider,
  sanitizeOracleRequest,
  sanitizeProgressForCloud,
} from "./services/cloudContracts.js";

const validConfig = {
  gemini: { serverEndpoint: "/api/oracle", serverMediated: true, parentSessionRequired: true, responsePolicyVersion: "v1" },
  firebase: { projectId: "lumora-demo", authMode: "parent-owned", rulesVersion: "2", rulesDeployed: true, collectionPattern: "parents/{parentId}/children/{childId}", persistentWebCache: false, retentionDays: 90 },
};
const requestPolicy = {
  allowedNodeIds: ["collect"],
  allowedSkillIds: ["count"],
  allowedTypes: ["collect"],
  allowedErrorCodes: ["COUNT_SHORT"],
  allowedSupportPolicies: ["balanced"],
};

test("cloud readiness is blocked by default and rejects client Gemini keys", () => {
  assert.equal(auditCloudIntegrationConfig().ready, false);
  assert.equal(auditCloudIntegrationConfig(validConfig).ready, true);
  const unsafe = structuredClone(validConfig);
  unsafe.gemini.clientApiKey = "secret";
  const audit = auditCloudIntegrationConfig(unsafe);
  assert.equal(audit.gemini.ready, false);
  assert.ok(audit.gemini.blockers.includes("CLIENT_API_KEY_FORBIDDEN"));
});

test("Firebase readiness requires parent ownership, deployed rules and trusted-device consent", () => {
  const unsafe = structuredClone(validConfig);
  unsafe.firebase.authMode = "anonymous";
  unsafe.firebase.rulesDeployed = false;
  unsafe.firebase.persistentWebCache = true;
  const blockers = auditCloudIntegrationConfig(unsafe).firebase.blockers;
  assert.ok(blockers.includes("PARENT_AUTH_REQUIRED"));
  assert.ok(blockers.includes("SECURITY_RULES_REQUIRED"));
  assert.ok(blockers.includes("TRUSTED_DEVICE_CONSENT_REQUIRED"));
});

test("Oracle request strips aliases, age bands and free-form error text", () => {
  const sanitized = sanitizeOracleRequest({ nodeId: "collect", skillId: "count", type: "collect", hintLevel: 9, errorCode: "COUNT_SHORT", priorMastery: 2, supportPolicy: "balanced", alias: "An", ageBand: "5-6", message: "raw child text" }, requestPolicy);
  assert.deepEqual(Object.keys(sanitized).sort(), ["errorCode", "hintLevel", "nodeId", "priorMastery", "schemaVersion", "skillId", "supportPolicy", "type"]);
  assert.equal(sanitized.hintLevel, 3);
  assert.equal(JSON.stringify(sanitized).includes("An"), false);
  assert.equal(JSON.stringify(sanitized).includes("5-6"), false);
});

test("Oracle request rejects PII hidden inside allowlisted field names", () => {
  const sanitized = sanitizeOracleRequest({ nodeId: "child@example.com", skillId: "An", type: "collect", errorCode: "private note", supportPolicy: "balanced" }, requestPolicy);
  assert.equal(sanitized.nodeId, undefined);
  assert.equal(sanitized.skillId, undefined);
  assert.equal(sanitized.errorCode, undefined);
  assert.equal(sanitized.type, "collect");
});

test("server Oracle accepts only curriculum-bound approved responses", async () => {
  let requestBody;
  const provider = createServerOracleProvider({ config: validConfig.gemini, requestPolicy, fetchImpl: async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return { ok: true, json: async () => ({ schemaVersion: "1", text: "Nhìn nhóm sáng bên trái nhé.", hintLevel: 2, safetyStatus: "approved", curriculumBound: true }) };
  } });
  const result = await provider.getHint({ type: "collect", level: 2, alias: "private" });
  assert.equal(result.ok, true);
  assert.equal(result.hint.text, "Nhìn nhóm sáng bên trái nhé.");
  assert.equal("alias" in requestBody, false);
  const rejected = createServerOracleProvider({ config: validConfig.gemini, requestPolicy, fetchImpl: async () => ({ ok: true, json: async () => ({ schemaVersion: "1", text: "answer", hintLevel: 1, safetyStatus: "unchecked", curriculumBound: false }) }) });
  assert.deepEqual(await rejected.getHint({ type: "collect" }), { ok: false, reason: "invalid-response" });
});

test("server Oracle cannot activate without full readiness or through a direct Gemini URL", async () => {
  const incomplete = createServerOracleProvider({ config: { serverEndpoint: "/api/oracle" }, fetchImpl: async () => ({ ok: true }) });
  assert.equal(incomplete.descriptor.active, false);
  const direct = createServerOracleProvider({ config: { ...validConfig.gemini, serverEndpoint: "https://generativelanguage.googleapis.com/v1/models?key=secret" }, fetchImpl: async () => ({ ok: true }) });
  assert.equal(direct.descriptor.active, false);
  assert.equal((await direct.getHint({})).reason, "not-configured");
  const noPolicy = createServerOracleProvider({ config: validConfig.gemini, fetchImpl: async () => ({ ok: true }) });
  assert.equal(noPolicy.descriptor.active, false);
  assert.ok(noPolicy.descriptor.blockers.includes("REQUEST_POLICY_REQUIRED"));
  for (const serverEndpoint of ["/api/../non-api", "/api/%2e%2e/non-api"]) {
    const traversal = createServerOracleProvider({ config: { ...validConfig.gemini, serverEndpoint }, requestPolicy, fetchImpl: async () => ({ ok: true }) });
    assert.equal(traversal.descriptor.active, false);
  }
});

test("hybrid Oracle falls back deterministically when remote fails", async () => {
  const local = createRuleBasedOracleProvider({ collect: ["Gợi ý local"] });
  const hybrid = createHybridOracleProvider({ localProvider: local, remoteProvider: { getHint: async () => ({ ok: false, reason: "timeout" }) } });
  const hint = await hybrid.getHint({ type: "collect", level: 1 });
  assert.equal(hint.text, "Gợi ý local");
  assert.equal(hint.remoteFallbackReason, "timeout");
});

test("hybrid Oracle also falls back when the remote provider throws", async () => {
  const local = createRuleBasedOracleProvider({ collect: ["Gợi ý local"] });
  const hybrid = createHybridOracleProvider({ localProvider: local, remoteProvider: { getHint: async () => { throw new Error("offline"); } } });
  const hint = await hybrid.getHint({ type: "collect", level: 1 });
  assert.equal(hint.text, "Gợi ý local");
  assert.equal(hint.remoteFallbackReason, "remote-exception");
});

test("cloud progress payload keeps canonical progress and strips profile data", () => {
  const cloud = sanitizeProgressForCloud({ completed: ["collect", "fake"], shards: 3, xp: 45, energies: { logic: 2, mastery: 1, unknown: 99 }, nubiStage: 1, learningMetrics: {}, gameplayMetrics: {}, alias: "An", email: "x@example.com" }, { validNodeIds: ["collect"], validSkillIds: ["count"] });
  assert.deepEqual(cloud.completed, ["collect"]);
  assert.equal(cloud.xp, 45);
  assert.deepEqual(cloud.energies, { logic: 2, nature: 0, discovery: 0, mastery: 1 });
  assert.equal("alias" in cloud, false);
  assert.equal("email" in cloud, false);
});

test("cloud progress strips nested identifiers outside node and skill allowlists", () => {
  const cloud = sanitizeProgressForCloud({
    completed: ["collect"],
    learningMetrics: { count: { bestMastery: 2 }, "child@example.com": { bestMastery: 3 } },
    nodeOutcomes: { collect: { skillId: "child@example.com", mastery: 2 } },
    gameplayMetrics: {},
    activityHistory: [{ nodeId: "collect", skillId: "child@example.com", completedAt: "2026-08-10T00:00:00.000Z" }],
    cityState: { selectedBuildingId: "child@example.com" },
    lastPlayedAt: "child@example.com",
  }, { validNodeIds: ["collect"], validSkillIds: ["count"] });
  assert.deepEqual(Object.keys(cloud.learningMetrics), ["count"]);
  assert.deepEqual(cloud.nodeOutcomes, {});
  assert.deepEqual(cloud.activityHistory, []);
  assert.equal("cityState" in cloud, false);
  assert.equal(JSON.stringify(cloud).includes("example.com"), false);
  assert.equal(cloud.lastPlayedAt, null);
});

test("cloud progress canonicalizes parseable dates so appended PII cannot survive", () => {
  const cloud = sanitizeProgressForCloud({
    completed: [],
    learningMetrics: {},
    gameplayMetrics: {},
    lastPlayedAt: "Mon, 10 Aug 2026 00:00:00 GMT (child@example.com)",
  }, { validNodeIds: ["collect"], validSkillIds: ["count"] });
  assert.equal(cloud.lastPlayedAt, "2026-08-10T00:00:00.000Z");
  assert.equal(JSON.stringify(cloud).includes("example.com"), false);
});

test("cloud progress keeps only allowlisted optional quest state", () => {
  const cloud = sanitizeProgressForCloud({
    completed: [], learningMetrics: {}, gameplayMetrics: {},
    questState: { completedIds: ["side-one", "child@example.com"], discoveredIds: ["side-one", "hidden"], metrics: { "side-one": { completions: 1, bestMastery: 2 }, "child@example.com": { completions: 9 } } },
  }, { validNodeIds: ["collect"], validSkillIds: ["count"], validQuestIds: ["side-one"] });
  assert.deepEqual(cloud.questState.completedIds, ["side-one"]);
  assert.deepEqual(cloud.questState.discoveredIds, ["side-one"]);
  assert.equal(JSON.stringify(cloud.questState).includes("example.com"), false);
});

test("cloud progress keeps only allowlisted campaign world ids", () => {
  const cloud = sanitizeProgressForCloud({
    completed: [], learningMetrics: {}, gameplayMetrics: {},
    campaignState: { activeWorldId: "forest-awakening", completedWorldIds: ["forest-awakening", "child@example.com", "unknown"] },
  }, { validNodeIds: ["collect"], validSkillIds: ["count"], validWorldIds: ["forest-awakening", "grade-1-world-2"] });
  assert.deepEqual(cloud.campaignState, { activeWorldId: "forest-awakening", completedWorldIds: ["forest-awakening"] });
  assert.equal(JSON.stringify(cloud.campaignState).includes("example.com"), false);

  const invalidActive = sanitizeProgressForCloud({
    completed: [], learningMetrics: {}, gameplayMetrics: {}, campaignState: { activeWorldId: "private-child", completedWorldIds: [] },
  }, { validNodeIds: ["collect"], validSkillIds: ["count"], validWorldIds: ["forest-awakening"] });
  assert.equal(invalidActive.campaignState.activeWorldId, null);
});

test("Firebase sync contract uses owner path and compare-and-set conflicts", async () => {
  const calls = [];
  const transport = {
    read: async (path) => { calls.push(["read", path]); return { revision: 0 }; },
    compareAndSet: async (path, revision, document) => { calls.push(["write", path, revision, document]); return { ok: true }; },
  };
  const sync = createFirebaseProgressSyncContract({ config: validConfig.firebase, transport, validNodeIds: ["collect"], validSkillIds: ["count"], clock: () => "2026-08-10T00:00:00.000Z" });
  const result = await sync.sync({ parentId: "parent_1", childId: "child_1", progress: { completed: ["collect"], learningMetrics: {}, gameplayMetrics: {} }, revision: 0 });
  assert.equal(result.status, "synced");
  assert.equal(result.path, "parents/parent_1/children/child_1");
  assert.equal(calls[1][2], 0);
  assert.equal("alias" in result.document.progress, false);
  const conflicting = createFirebaseProgressSyncContract({ config: validConfig.firebase, transport: { read: async () => ({ revision: 3, progress: {} }), compareAndSet: async () => ({ ok: true }) } });
  assert.equal((await conflicting.sync({ parentId: "p", childId: "c", progress: {}, revision: 1 })).status, "conflict");
});

test("Firebase sync contract is disabled without a transport and rejects unsafe paths", async () => {
  assert.equal((await createFirebaseProgressSyncContract().sync({})).status, "disabled");
  const contract = createFirebaseProgressSyncContract({ config: validConfig.firebase, transport: { read: async () => null, compareAndSet: async () => ({ ok: true }) } });
  assert.equal((await contract.sync({ parentId: "../parent", childId: "child", progress: {} })).reason, "invalid-owner-path");
});

test("Firebase sync contract returns controlled read and write errors", async () => {
  const readFailure = createFirebaseProgressSyncContract({ config: validConfig.firebase, transport: { read: async () => { throw new Error("offline"); }, compareAndSet: async () => ({ ok: true }) } });
  assert.equal((await readFailure.sync({ parentId: "p", childId: "c", progress: {} })).reason, "read-failed");
  const writeFailure = createFirebaseProgressSyncContract({ config: validConfig.firebase, transport: { read: async () => null, compareAndSet: async () => { throw new Error("offline"); } } });
  assert.equal((await writeFailure.sync({ parentId: "p", childId: "c", progress: {} })).reason, "write-failed");
});

test("Firebase transport cannot activate without parent auth and deployed rules", async () => {
  const contract = createFirebaseProgressSyncContract({ transport: { read: async () => null, compareAndSet: async () => ({ ok: true }) } });
  assert.equal(contract.descriptor.active, false);
  assert.equal((await contract.sync({ parentId: "p", childId: "c", progress: {} })).status, "disabled");
});
