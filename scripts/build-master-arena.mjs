import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { productionBlindReviewMarkdown } from "../evals/production-comedy.mjs";

const workspace = process.cwd();
const sharedRoot = path.resolve(workspace, "evals/shared-runs");
const header = "run_id,packet_id,decision,rank,reason,notes,mechanics,tone,grounding";

function safeId(value) {
  const id = String(value || "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!id) throw new Error("A non-empty arena id is required.");
  return id;
}

function stableOrder(value) {
  return createHash("sha256").update(value).digest("hex");
}

function candidateLabel(index) {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label.toLowerCase();
}

export function buildMasterArena(sourceRuns) {
  const candidates = sourceRuns.flatMap(({ id, results }) => results
    .filter((result) => !result.failed && !result.skipped && typeof result.script === "string" && result.script.trim())
    .map((result) => ({
      ...result,
      runId: `${id}__${result.runId}`,
      profile: "master_comedy_arena",
      sourceBundle: id,
    })));
  candidates.sort((left, right) => stableOrder(left.runId).localeCompare(stableOrder(right.runId)));
  return candidates;
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--runs") options.runs = (args[++index] || "").split(",").filter(Boolean);
    else if (value === "--id") options.id = args[++index];
    else if (value === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!options.help && (!options.runs?.length || !options.id)) {
    throw new Error("Usage: npm run evals:arena -- --runs production-run,qwen-run,venice-run --id master-arena-id");
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: npm run evals:arena -- --runs production-run,qwen-run,venice-run --id master-arena-id");
    return;
  }
  const id = safeId(options.id);
  const destination = path.resolve(sharedRoot, id);
  if (!destination.startsWith(`${sharedRoot}${path.sep}`)) throw new Error("Invalid arena id.");
  try {
    await access(destination);
    throw new Error(`Arena already exists: ${id}. Choose a new --id instead of overwriting a reviewed arena.`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const sourceRuns = await Promise.all(options.runs.map(async (runId) => ({
    id: safeId(runId),
    results: JSON.parse(await readFile(path.join(sharedRoot, safeId(runId), "results.json"), "utf8")),
  })));
  const candidates = buildMasterArena(sourceRuns);
  if (!candidates.length) throw new Error("The selected runs contain no valid production script candidates.");
  const guidelineHash = createHash("sha256").update(await readFile(path.join(workspace, "joke_guidelines.md"))).digest("hex");
  const reviewRows = candidates.map((_, index) => `candidate-${candidateLabel(index)},packet-1,,,,,,,`);
  await mkdir(destination, { recursive: true });
  await Promise.all([
    writeFile(path.join(destination, "manifest.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), kind: "master_comedy_arena", sourceRuns: options.runs, candidateCount: candidates.length, jokeGuidelinesSha256: guidelineHash }, null, 2)}\n`),
    writeFile(path.join(destination, "results.json"), `${JSON.stringify(candidates, null, 2)}\n`),
    writeFile(path.join(destination, "blind-review.md"), productionBlindReviewMarkdown(candidates)),
    writeFile(path.join(destination, "review.csv"), `${header}\n${reviewRows.join("\n")}\n`),
  ]);
  console.log(`Created master blind arena: ${path.relative(workspace, destination)} (${candidates.length} candidates)`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
