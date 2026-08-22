import { readFile } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = path.basename(process.cwd()) === "web"
  ? path.resolve(process.cwd(), "..")
  : process.cwd();

const EXAMPLES_FILENAME = "comedy_examples.json";
const CORPUS_FILENAME = "comedy_corpus.json";
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

// This is a compact, original mechanics summary of the authorised reference
// corpus. Raw transcripts remain local and are never added to app prompts.
export async function loadComedyCorpus({ root = repositoryRoot } = {}) {
  try {
    const raw = await readFile(path.join(root, CORPUS_FILENAME), "utf8");
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

export function formatCorpusBlock(corpus, { oneLiner = false } = {}) {
  const mechanics = Array.isArray(corpus?.mechanics)
    ? corpus.mechanics.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const recipe = corpus?.scriptRecipe && typeof corpus.scriptRecipe === "object" ? corpus.scriptRecipe : {};
  if (!mechanics.length && !recipe.shape) return "";
  return [
    "Authorised comedy-corpus mechanics. These are original production notes, not lines to copy:",
    ...mechanics.map((item) => `- ${item}`),
    oneLiner
      ? "For this benchmark, compress the setup, turn, and punch into exactly one sentence of 18-32 words."
      : recipe.targetWords ? `Target ${recipe.targetWords} words while still obeying the 55-85 word contract.` : "",
    oneLiner ? "Structure: one sentence only; use the final clause as the callback or hardest hit." : recipe.shape ? `Structure: ${recipe.shape}` : "",
    recipe.voice ? `Voice: ${recipe.voice}` : "",
  ].filter(Boolean).join("\n");
}
