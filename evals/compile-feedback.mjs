import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { compileFeedback, parseCsv } from "./feedback.mjs";

const root = path.resolve("evals/shared-runs");
const ignored = new Set(["README.md", "leaderboard.json", "preference-pairs.jsonl"]);

const entries = await readdir(root, { withFileTypes: true });
const runs = await Promise.all(entries.filter((entry) => entry.isDirectory() && !ignored.has(entry.name)).map(async (entry) => {
  const directory = path.join(root, entry.name);
  const [results, reviewText] = await Promise.all([
    readFile(path.join(directory, "results.json"), "utf8").then(JSON.parse),
    readFile(path.join(directory, "review.csv"), "utf8"),
  ]);
  return { id: entry.name, results, reviews: parseCsv(reviewText) };
}));
const compiled = compileFeedback(runs);
const summary = {
  generatedAt: new Date().toISOString(),
  leaderboard: compiled.leaderboard,
  records: compiled.records,
  pairwiseComparisons: compiled.comparisons.length,
  pairwiseStandings: compiled.standings,
};
await Promise.all([
  writeFile(path.join(root, "leaderboard.json"), `${JSON.stringify(summary, null, 2)}\n`),
  writeFile(path.join(root, "preference-pairs.jsonl"), compiled.pairs.map((pair) => JSON.stringify(pair)).join("\n") + (compiled.pairs.length ? "\n" : "")),
]);
console.log(JSON.stringify({ reviewedRecords: compiled.records.length, preferencePairs: compiled.pairs.length, pairwiseComparisons: compiled.comparisons.length, leaderboard: compiled.leaderboard }, null, 2));
