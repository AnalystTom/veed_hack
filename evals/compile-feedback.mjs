import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { compileFeedback, parseCsv } from "./feedback.mjs";
import { buildPairs } from "./reviewer-server.mjs";

const root = path.resolve("evals/shared-runs");
const ignored = new Set(["README.md", "leaderboard.json", "preference-pairs.jsonl"]);

function parseArgs(args) {
  const options = { arenas: [] };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--arena") options.arenas.push(args[++index]);
    else if (value === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${value}`);
  }
  return options;
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

function pairwiseComparisonsForRun(bundle, results, saved) {
  const visible = results.filter((result) => !result.failed && !result.skipped && result.script).map((result, index) => ({
    id: `candidate-${candidateLabel(index)}`,
    script: result.script,
    result,
  }));
  const candidateById = new Map(visible.map((candidate) => [candidate.id, candidate.result]));
  const pairById = new Map(buildPairs(visible).map((pair) => [pair.id, pair]));
  return Object.entries(saved?.answers || []).flatMap(([pairId, answer]) => {
    const pair = pairById.get(pairId);
    if (!pair || !["left", "right", "tie"].includes(answer?.choice)) return [];
    const toReference = (candidate) => {
      const result = candidateById.get(candidate.id);
      return result && {
        runId: result.runId,
        packetId: "packet-1",
        provider: result.provider,
        model: result.model,
        profile: result.profile,
        variant: result.variant || null,
      };
    };
    const left = toReference(pair.left);
    const right = toReference(pair.right);
    if (!left || !right) return [];
    return [{
      bundle,
      profile: "pairwise_ui",
      left,
      right,
      outcome: answer.choice,
      rationale: String(answer.comment || "").trim() || "Human pairwise choice",
    }];
  });
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  console.log("Usage: npm run evals:compile-feedback -- [--arena shared-arena-id]");
  process.exit(0);
}

const entries = await readdir(root, { withFileTypes: true });
const selected = entries.filter((entry) => entry.isDirectory() && !ignored.has(entry.name) && (!options.arenas.length || options.arenas.includes(entry.name)));
const runs = await Promise.all(selected.map(async (entry) => {
  const directory = path.join(root, entry.name);
  const [results, reviewText, pairwise] = await Promise.all([
    readFile(path.join(directory, "results.json"), "utf8").then(JSON.parse),
    readFile(path.join(directory, "review.csv"), "utf8"),
    readFile(path.join(directory, "pairwise-review.json"), "utf8").then(JSON.parse).catch(() => ({ answers: {} })),
  ]);
  return { id: entry.name, results, reviews: parseCsv(reviewText), pairwiseComparisons: pairwiseComparisonsForRun(entry.name, results, pairwise) };
}));
const compiled = compileFeedback(runs);
const summary = {
  generatedAt: new Date().toISOString(),
  leaderboard: compiled.leaderboard,
  records: compiled.records,
  pairwiseComparisons: compiled.comparisons.length,
  directPairwiseChoices: runs.reduce((total, run) => total + run.pairwiseComparisons.length, 0),
  pairwiseStandings: compiled.standings,
};
await Promise.all([
  writeFile(path.join(root, "leaderboard.json"), `${JSON.stringify(summary, null, 2)}\n`),
  writeFile(path.join(root, "preference-pairs.jsonl"), compiled.pairs.map((pair) => JSON.stringify(pair)).join("\n") + (compiled.pairs.length ? "\n" : "")),
]);
console.log(JSON.stringify({ reviewedRecords: compiled.records.length, preferencePairs: compiled.pairs.length, pairwiseComparisons: compiled.comparisons.length, leaderboard: compiled.leaderboard }, null, 2));
