import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { productionBlindReviewMarkdown } from "../evals/production-comedy.mjs";

const workspace = process.cwd();
const sharedRoot = path.resolve(workspace, "evals/shared-runs");
const header = "run_id,packet_id,decision,rank,reason,notes,mechanics,tone,grounding";

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

// Word-set of a script, lowercased with punctuation stripped, so two jokes that
// differ only in punctuation or casing compare as the same bag of words.
export function wordSet(script) {
  return new Set(String(script || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean));
}

export function jaccard(a, b) {
  if (!a.size && !b.size) return 1;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / (a.size + b.size - shared);
}

// Greedily keep the first candidate and drop any later candidate whose word-set
// Jaccard similarity to an already-kept candidate meets the threshold. Returns
// the kept list plus a record of every drop and the near-duplicate it matched,
// so nothing is removed silently.
export function dedupeCandidates(candidates, { threshold = 0.6 } = {}) {
  const kept = [];
  const keptSets = [];
  const dropped = [];
  for (const candidate of candidates) {
    if (!candidate.script) { kept.push(candidate); keptSets.push(new Set()); continue; }
    const set = wordSet(candidate.script);
    let match = null;
    for (let index = 0; index < kept.length; index += 1) {
      const similarity = jaccard(set, keptSets[index]);
      if (similarity >= threshold) { match = { runId: kept[index].runId, similarity: Number(similarity.toFixed(3)) }; break; }
    }
    if (match) dropped.push({ runId: candidate.runId, script: candidate.script, nearestKept: match });
    else { kept.push(candidate); keptSets.push(set); }
  }
  return { kept, dropped };
}

function parseArgs(args) {
  const options = { threshold: 0.6 };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--arena") options.arena = args[++index];
    else if (value === "--threshold") options.threshold = Number(args[++index]);
    else if (value === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!options.help && !options.arena) throw new Error("Usage: node scripts/dedupe-arena.mjs --arena evals/shared-runs/<arena-id> [--threshold 0.6]");
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { console.log("Usage: node scripts/dedupe-arena.mjs --arena evals/shared-runs/<arena-id> [--threshold 0.6]"); return; }
  const arena = path.resolve(workspace, options.arena);
  if (!arena.startsWith(`${sharedRoot}${path.sep}`)) throw new Error("Arena must be beneath evals/shared-runs.");
  const results = JSON.parse(await readFile(path.join(arena, "results.json"), "utf8"));
  const { kept, dropped } = dedupeCandidates(results, { threshold: options.threshold });
  if (!dropped.length) { console.log(`No near-duplicates at threshold ${options.threshold}; ${kept.length} candidates unchanged.`); return; }
  const reviewRows = kept.map((_, index) => `candidate-${candidateLabel(index)},packet-1,,,,,,,`);
  await Promise.all([
    writeFile(path.join(arena, "results.json"), `${JSON.stringify(kept, null, 2)}\n`),
    writeFile(path.join(arena, "review.csv"), `${header}\n${reviewRows.join("\n")}\n`),
    writeFile(path.join(arena, "blind-review.md"), productionBlindReviewMarkdown(kept)),
  ]);
  console.log(`Dropped ${dropped.length} near-duplicate candidate(s) at threshold ${options.threshold}; kept ${kept.length}.`);
  for (const drop of dropped) console.log(`  - ${drop.runId} ~= ${drop.nearestKept.runId} (jaccard ${drop.nearestKept.similarity})`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
