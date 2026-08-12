import { nodes, optionalQuests } from "../src/gameData.js";
import { buildCurriculumReviewPacket, formatCurriculumReviewMarkdown } from "../src/curriculumReview.js";

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && !["--json", "--markdown"].includes(args[0]))) {
  console.error(`Unknown argument: ${args.join(" ") || "(empty)"}. Use --markdown or --json.`);
  process.exit(2);
}

const packet = buildCurriculumReviewPacket(nodes, optionalQuests);
process.stdout.write(args[0] === "--json" ? `${JSON.stringify(packet, null, 2)}\n` : formatCurriculumReviewMarkdown(packet));
