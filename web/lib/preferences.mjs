import { readFile } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = path.basename(process.cwd()) === "web"
  ? path.resolve(process.cwd(), "..")
  : process.cwd();

const EXAMPLES_FILENAME = "comedy_examples.json";
const DEFAULT_LIMIT = 4;

// Pure selector so the curation contract is unit-testable without the filesystem.
export function selectCuratedExamples(data, templateId, limit = DEFAULT_LIMIT) {
  if (!data || typeof data !== "object") return [];
  const list = Array.isArray(data[templateId]) ? data[templateId] : [];
  const max = Math.max(0, Number(limit) || 0);
  return list
    .map((line) => String(line || "").trim())
    .filter(Boolean)
    .slice(0, max);
}

// Loads the human-curated winning lines for a template. Missing or malformed
// files degrade to no examples rather than blocking generation.
export async function loadCuratedExamples(templateId, { root = repositoryRoot, limit = DEFAULT_LIMIT } = {}) {
  try {
    const raw = await readFile(path.join(root, EXAMPLES_FILENAME), "utf8");
    return selectCuratedExamples(JSON.parse(raw), templateId, limit);
  } catch {
    return [];
  }
}

export function formatExamplesBlock(examples) {
  const lines = (Array.isArray(examples) ? examples : [])
    .map((line) => String(line || "").trim())
    .filter(Boolean);
  if (!lines.length) return "";
  return [
    "Preferred lines. Match their rhythm, economy, and bite. Never reuse their wording, subject, or jokes:",
    ...lines.map((line, index) => `${index + 1}. ${line}`),
  ].join("\n");
}
