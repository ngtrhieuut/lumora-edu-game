import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { nodes } from "./gameData.js";
import { assertProductionCurriculum, auditCurriculum, CurriculumReleaseError, validateCurriculumNode } from "./curriculumEngine.js";

const approvedNode = {
  id: "official-1",
  type: "collect",
  grade: 1,
  subject: "Toán",
  domain: "Số và phép tính",
  skillId: "MATH_G1_OFFICIAL_TEST",
  skillNameVi: "Kỹ năng đã duyệt",
  objectiveVi: "Mục tiêu được đối chiếu với nguồn chính thức.",
  prerequisites: [],
  difficulty: "intro",
  sourceReference: "Thông tư 32/2018/TT-BGDĐT — mục được reviewer xác nhận",
  sourceEvidence: {
    kind: "official-curriculum",
    documentId: "32/2018/TT-BGDĐT",
    revision: "2018-12-26",
    reviewedBy: "curriculum-reviewer",
    reviewedAt: "2026-08-10T00:00:00.000Z",
  },
  approved: true,
  gameplayTemplates: ["collect"],
};

test("current game nodes are prototype-valid but production-blocked", () => {
  const prototypeAudit = auditCurriculum(nodes);
  assert.equal(prototypeAudit.valid, true);
  assert.equal(prototypeAudit.nodeCount, 12);
  assert.equal(prototypeAudit.approvedCount, 0);
  assert.ok(prototypeAudit.warnings.some((entry) => entry.code === "PROTOTYPE_UNAPPROVED"));
  const releaseAudit = auditCurriculum(nodes, { mode: "production" });
  assert.equal(releaseAudit.valid, false);
  assert.equal(releaseAudit.errors.filter((entry) => entry.code === "NOT_APPROVED").length, 12);
  assert.equal(releaseAudit.errors.filter((entry) => entry.code === "SOURCE_NOT_OFFICIAL").length, 12);
  assert.equal(releaseAudit.errors.filter((entry) => entry.code === "SOURCE_EVIDENCE_REQUIRED").length, 12);
});

test("approved production content requires complete schema and a reviewed source", () => {
  assert.equal(validateCurriculumNode(approvedNode, { mode: "production" }).valid, true);
  assert.equal(validateCurriculumNode({ ...approvedNode, sourceReference: "Prototype placeholder" }, { mode: "production" }).valid, false);
  for (const sourceReference of ["TBD", "x", "AI-generated draft"]) {
    assert.equal(validateCurriculumNode({ ...approvedNode, sourceReference }, { mode: "production" }).valid, false);
  }
  assert.equal(validateCurriculumNode({ ...approvedNode, sourceEvidence: undefined }, { mode: "production" }).valid, false);
  const malformed = validateCurriculumNode({ id: "bad", approved: "yes", prerequisites: "none" });
  assert.equal(malformed.valid, false);
  assert.ok(malformed.errors.length >= 5);
});

test("runtime mechanic and gameplay template must be supported and consistent", () => {
  assert.equal(validateCurriculumNode({ ...approvedNode, type: "unknown", gameplayTemplates: ["unknown"] }).valid, false);
  assert.equal(validateCurriculumNode({ ...approvedNode, type: "collect", gameplayTemplates: ["shape"] }).valid, false);
  assert.equal(validateCurriculumNode({ ...approvedNode, type: "collect", gameplayTemplates: ["collect"] }).valid, true);
});

test("collection audit rejects duplicates and invalid prerequisite ordering", () => {
  const duplicate = { ...approvedNode, id: "official-1", skillId: approvedNode.skillId, prerequisites: ["official-1"] };
  const audit = auditCurriculum([approvedNode, duplicate], { mode: "production" });
  assert.equal(audit.valid, false);
  assert.ok(audit.errors.some((entry) => entry.code === "DUPLICATE_NODE_ID"));
  assert.ok(audit.errors.some((entry) => entry.code === "DUPLICATE_SKILL_ID"));
  const future = auditCurriculum([
    { ...approvedNode, id: "first", skillId: "first-skill", prerequisites: ["second"] },
    { ...approvedNode, id: "second", skillId: "second-skill", prerequisites: [] },
  ], { mode: "production" });
  assert.ok(future.errors.some((entry) => entry.code === "PREREQUISITE_ORDER"));
  const unknown = auditCurriculum([{ ...approvedNode, prerequisites: ["missing"] }], { mode: "production" });
  assert.ok(unknown.errors.some((entry) => entry.code === "PREREQUISITE_UNKNOWN"));
  const external = auditCurriculum([{ ...approvedNode, id: "side", skillId: "side-skill", prerequisites: [approvedNode.id] }], {
    mode: "production",
    externalPrerequisiteIds: [approvedNode.id],
  });
  assert.equal(external.valid, true);
});

test("assertProductionCurriculum throws a structured immutable audit", () => {
  const before = structuredClone(nodes);
  assert.throws(() => assertProductionCurriculum(nodes), (error) => {
    assert.ok(error instanceof CurriculumReleaseError);
    assert.equal(error.code, "CURRICULUM_RELEASE_BLOCKED");
    assert.equal(error.audit.mode, "production");
    return true;
  });
  assert.deepEqual(nodes, before);
  assert.equal(assertProductionCurriculum([approvedNode]).valid, true);
});

test("malformed collections are deterministic and safe", () => {
  assert.deepEqual(auditCurriculum(null), auditCurriculum(null));
  assert.equal(auditCurriculum(null).valid, false);
  assert.equal(auditCurriculum([]).valid, false);
});

test("curriculum CLI rejects misspelled or unknown flags", () => {
  const script = fileURLToPath(new URL("../scripts/audit-curriculum.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [script, "--relase"], { encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown argument/);
});
