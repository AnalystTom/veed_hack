import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const workspace = process.cwd();
const localRoot = path.resolve(workspace, "data/eval-runs");
const sharedRoot = path.resolve(workspace, "evals/shared-runs");

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--id") options.id = args[++index];
    else if (!options.source) options.source = value;
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!options.source) throw new Error("Usage: npm run evals:publish -- data/eval-runs/<run-id> [--id shared-run-id]");
  return options;
}

function safeId(value) {
  const id = String(value || "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!id) throw new Error("A non-empty shared run id is required.");
  return id;
}

function sanitiseManifest(manifest) {
  const { referenceCards, corpusFiles, ...referenceSignals } = manifest.referenceSignals || {};
  return { ...manifest, referenceSignals };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const source = path.resolve(workspace, options.source);
  if (!source.startsWith(`${localRoot}${path.sep}`)) throw new Error("Only a run beneath data/eval-runs may be published.");
  const id = safeId(options.id || path.basename(source));
  const destination = path.resolve(sharedRoot, id);
  if (!destination.startsWith(`${sharedRoot}${path.sep}`)) throw new Error("Invalid shared run id.");
  const [manifest, results] = await Promise.all([
    readFile(path.join(source, "manifest.json"), "utf8").then(JSON.parse),
    readFile(path.join(source, "results.json"), "utf8").then(JSON.parse),
  ]);
  await mkdir(destination, { recursive: true });
  await Promise.all([
    writeFile(path.join(destination, "manifest.json"), `${JSON.stringify(sanitiseManifest(manifest), null, 2)}\n`),
    writeFile(path.join(destination, "results.json"), `${JSON.stringify(results, null, 2)}\n`),
    cp(path.join(source, "blind-review.md"), path.join(destination, "blind-review.md")),
    cp(path.join(workspace, "evals/review-template.csv"), path.join(destination, "review.csv")),
  ]);
  console.log(`Published shared eval run: ${path.relative(workspace, destination)}`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
