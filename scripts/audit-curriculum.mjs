import { auditCampaignRegistry } from "../src/campaignEngine.js";
import { auditCurriculum, mergeCurriculumAudits } from "../src/curriculumEngine.js";
import {
  cityCosmetics,
  cityRestorationFeatures,
  environmentRestorationScenarios,
  nodes,
  optionalQuests,
  resourceRouteScenarios,
  worlds,
} from "../src/gameData.js";

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== "--release")) {
  console.error(`Unknown argument: ${args.join(" ") || "(empty)"}. Use no flag for prototype or --release for production.`);
  process.exit(2);
}

const mode = args[0] === "--release" ? "production" : "prototype";
const mainAudit = auditCurriculum(nodes, { mode });
const optionalAudit = auditCurriculum(optionalQuests, { mode, externalPrerequisiteIds: nodes.map((node) => node.id) });
const curriculumAudit = mergeCurriculumAudits(mainAudit, optionalAudit);
const campaignAudit = auditCampaignRegistry(worlds, nodes, {
  optionalQuests,
  resourceRouteScenarios,
  environmentRestorationScenarios,
  cityRestorationFeatures,
  cityCosmetics,
});
const registryErrors = campaignAudit.errors.map((message) => ({
  nodeId: "campaign-registry",
  code: "REGISTRY_INVALID",
  message,
}));
const audit = {
  valid: curriculumAudit.valid && campaignAudit.ok,
  errors: [...curriculumAudit.errors, ...registryErrors],
  warnings: curriculumAudit.warnings,
};
const status = audit.valid ? "PASS" : "BLOCKED";

console.log(`[curriculum:${mode}] ${status} - ${mainAudit.nodeCount} nodes, ${optionalAudit.nodeCount} optional quests, ${curriculumAudit.approvedCount} approved, ${audit.errors.length} errors, ${audit.warnings.length} warnings`);
for (const entry of audit.errors) console.error(`- ${entry.nodeId ?? "collection"}: ${entry.code} - ${entry.message}`);
if (!audit.valid) process.exitCode = 1;
