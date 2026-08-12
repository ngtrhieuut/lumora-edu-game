import { auditCurriculum, mergeCurriculumAudits } from "./curriculumEngine.js";

const RELEASE_BLOCKING_CODES = new Set([
  "FIELD_REQUIRED", "GRADE_INVALID", "PREREQUISITES_INVALID", "DIFFICULTY_INVALID",
  "GAMEPLAY_TEMPLATES_INVALID", "MECHANIC_UNSUPPORTED", "TEMPLATE_UNSUPPORTED",
  "TEMPLATE_TYPE_MISMATCH", "APPROVAL_INVALID", "DUPLICATE_NODE_ID", "DUPLICATE_SKILL_ID",
  "PREREQUISITE_UNKNOWN", "PREREQUISITE_ORDER",
]);
const asArray = (value) => (Array.isArray(value) ? value : []);
const isText = (value) => typeof value === "string" && value.trim().length > 0;
const unique = (values) => [...new Set(values.filter(isText))];

function getNodeAudit(audit, nodeId) {
  return audit.nodes.find((entry) => entry.nodeId === nodeId) ?? { errors: [], warnings: [] };
}

function classifyStatus(node, productionAudit) {
  const codes = new Set(getNodeAudit(productionAudit, node?.id).errors.map((entry) => entry.code));
  if ([...codes].some((code) => RELEASE_BLOCKING_CODES.has(code))) return "invalid";
  if (codes.has("SOURCE_NOT_OFFICIAL")) return "needs-official-source";
  if (codes.has("NOT_APPROVED")) return "needs-human-approval";
  if (codes.has("SOURCE_EVIDENCE_REQUIRED")) return "needs-review-evidence";
  return "release-ready";
}

function actionsFor(status) {
  if (status === "invalid") return ["Sửa schema, mechanic hoặc quan hệ prerequisite trước khi review nội dung."];
  if (status === "needs-official-source") return ["Gắn sourceReference tới tài liệu curriculum chính thức, cụ thể và có thể truy vết."];
  if (status === "needs-human-approval") return ["Human reviewer kiểm tra objective, interaction, đáp án và trải nghiệm rồi xác nhận approved."];
  if (status === "needs-review-evidence") return ["Bổ sung sourceEvidence gồm documentId, revision, reviewedBy và reviewedAt sau khi reviewer xác nhận."];
  return [];
}

function buildRow(node, prototypeAudit, productionAudit, index, entryKind = "main-node") {
  const nodeId = isText(node?.id) ? node.id.trim() : `row-${index + 1}`;
  const status = classifyStatus(node, productionAudit);
  const prototypeNodeAudit = getNodeAudit(prototypeAudit, nodeId);
  const productionNodeAudit = getNodeAudit(productionAudit, nodeId);
  return {
    index: Number.isInteger(node?.index) ? node.index : index + 1,
    entryKind,
    id: nodeId,
    title: isText(node?.title) ? node.title.trim() : "Chưa đặt tên",
    grade: Number.isInteger(node?.grade) ? node.grade : null,
    subject: isText(node?.subject) ? node.subject.trim() : null,
    domain: isText(node?.domain) ? node.domain.trim() : null,
    skillId: isText(node?.skillId) ? node.skillId.trim() : null,
    objectiveVi: isText(node?.objectiveVi) ? node.objectiveVi.trim() : null,
    mechanic: isText(node?.type) ? node.type.trim() : null,
    gameplayTemplates: unique(asArray(node?.gameplayTemplates)),
    prerequisites: unique(asArray(node?.prerequisites)),
    sourceReference: isText(node?.sourceReference) ? node.sourceReference.trim() : null,
    approved: node?.approved === true,
    status,
    requiredActions: actionsFor(status),
    prototypeWarnings: prototypeNodeAudit.warnings.map((entry) => entry.code),
    releaseErrors: productionNodeAudit.errors.map((entry) => entry.code),
  };
}

export function buildCurriculumReviewPacket(nodeDefinitions, optionalQuestDefinitions = []) {
  const definitions = asArray(nodeDefinitions);
  const optionalDefinitions = asArray(optionalQuestDefinitions);
  const prototypeAudits = [auditCurriculum(definitions, { mode: "prototype" })];
  const productionAudits = [auditCurriculum(definitions, { mode: "production" })];
  if (optionalDefinitions.length > 0) {
    const externalPrerequisiteIds = definitions.map((node) => node?.id);
    prototypeAudits.push(auditCurriculum(optionalDefinitions, { mode: "prototype", externalPrerequisiteIds }));
    productionAudits.push(auditCurriculum(optionalDefinitions, { mode: "production", externalPrerequisiteIds }));
  }
  const prototypeAudit = mergeCurriculumAudits(...prototypeAudits);
  const productionAudit = mergeCurriculumAudits(...productionAudits);
  const rows = [
    ...definitions.map((node, index) => buildRow(node, prototypeAudit, productionAudit, index, "main-node")),
    ...optionalDefinitions.map((quest, index) => buildRow(quest, prototypeAudit, productionAudit, definitions.length + index, "optional-quest")),
  ];
  const counts = rows.reduce((result, row) => {
    result[row.status] = (result[row.status] ?? 0) + 1;
    return result;
  }, {});
  return {
    version: 1,
    source: "local-game-data",
    policy: "Read-only review packet. It never changes approved or sourceEvidence.",
    prototype: { valid: prototypeAudit.valid, nodeCount: prototypeAudit.nodeCount, errors: prototypeAudit.errors.length, warnings: prototypeAudit.warnings.length },
    production: { valid: productionAudit.valid, nodeCount: productionAudit.nodeCount, errors: productionAudit.errors.length, warnings: productionAudit.warnings.length },
    mainNodeCount: definitions.length,
    optionalQuestCount: optionalDefinitions.length,
    summary: {
      total: rows.length,
      releaseReady: counts["release-ready"] ?? 0,
      needsOfficialSource: counts["needs-official-source"] ?? 0,
      needsHumanApproval: counts["needs-human-approval"] ?? 0,
      needsReviewEvidence: counts["needs-review-evidence"] ?? 0,
      invalid: counts.invalid ?? 0,
    },
    rows,
  };
}

export function formatCurriculumReviewMarkdown(packet) {
  const safe = packet && typeof packet === "object" ? packet : buildCurriculumReviewPacket([]);
  const rows = asArray(safe.rows);
  const summary = safe.summary ?? {};
  const lines = [
    "# Lumora Curriculum Review Packet", "",
    "> Read-only packet. Không tự chuyển `approved`, không thay thế curriculum review của con người.", "",
    `- Prototype: ${safe.prototype?.valid ? "PASS" : "BLOCKED"} · ${safe.prototype?.nodeCount ?? 0} nodes`,
    `- Production: ${safe.production?.valid ? "PASS" : "BLOCKED"} · ${safe.production?.errors ?? 0} lỗi`,
    `- Tổng: ${summary.total ?? rows.length} · Release-ready: ${summary.releaseReady ?? 0} · Cần source chính thức: ${summary.needsOfficialSource ?? 0} · Cần human approval: ${summary.needsHumanApproval ?? 0}`,
    "", "| # | Node | Skill | Mechanic | Status | Required action |", "|---:|---|---|---|---|---|",
  ];
  for (const row of rows) {
    const action = row.requiredActions?.[0] ?? "Không còn action release trong validator.";
    lines.push(`| ${row.index} | ${row.id} · ${row.title} | ${row.skillId ?? "—"} | ${row.mechanic ?? "—"} | ${row.status} | ${action} |`);
  }
  return `${lines.join("\n")}\n`;
}
