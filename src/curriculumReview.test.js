import test from "node:test";
import assert from "node:assert/strict";
import { nodes, optionalQuests } from "./gameData.js";
import { buildCurriculumReviewPacket, formatCurriculumReviewMarkdown } from "./curriculumReview.js";

const approvedNode = {
  ...nodes[0], approved: true,
  sourceReference: "Thông tư 32/2018/TT-BGDĐT, môn Toán, phụ lục Lớp 1",
  sourceEvidence: { kind: "official-curriculum", documentId: "TT32-2018-TOAN-G1", revision: "2018-12-26", reviewedBy: "Curriculum reviewer", reviewedAt: "2026-08-11T00:00:00.000Z" },
};

test("review packet keeps prototype pass separate from production release readiness", () => {
  const packet = buildCurriculumReviewPacket(nodes);
  assert.equal(packet.prototype.valid, true);
  assert.equal(packet.production.valid, false);
  assert.equal(packet.summary.total, 12);
  assert.equal(packet.summary.releaseReady, 0);
  assert.equal(packet.summary.needsOfficialSource, 12);
  assert.equal(packet.rows[0].status, "needs-official-source");
  assert.equal(packet.rows[0].approved, false);
});

test("a node becomes release-ready only with explicit approval and official evidence", () => {
  const packet = buildCurriculumReviewPacket([approvedNode]);
  assert.equal(packet.production.valid, true);
  assert.equal(packet.rows[0].status, "release-ready");
  assert.deepEqual(packet.rows[0].requiredActions, []);
});

test("review packet includes optional quests without auto-approving them", () => {
  const packet = buildCurriculumReviewPacket(nodes, optionalQuests);
  assert.equal(packet.mainNodeCount, 12);
  assert.equal(packet.optionalQuestCount, 3);
  assert.equal(packet.summary.total, 15);
  assert.equal(packet.summary.needsOfficialSource, 15);
  assert.equal(packet.rows[12].entryKind, "optional-quest");
  assert.equal(packet.rows[12].id, "firefly-pairs");
  assert.equal(packet.rows[12].approved, false);
  assert.equal(packet.production.valid, false);
});

test("invalid structure stays invalid even when approval fields are present", () => {
  const packet = buildCurriculumReviewPacket([{ ...approvedNode, id: "broken", type: "unknown-mechanic", gameplayTemplates: ["unknown-mechanic"] }]);
  assert.equal(packet.rows[0].status, "invalid");
  assert.ok(packet.rows[0].releaseErrors.includes("MECHANIC_UNSUPPORTED"));
  assert.ok(packet.rows[0].requiredActions.length > 0);
});

test("markdown packet is deterministic and states the no-auto-approval policy", () => {
  const markdown = formatCurriculumReviewMarkdown(buildCurriculumReviewPacket(nodes));
  assert.match(markdown, /Read-only packet/);
  assert.match(markdown, /không thay thế curriculum review/i);
  assert.match(markdown, /\| 12 \| boss/);
});
