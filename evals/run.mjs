import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getOptionalConfig } from "../src/config.js";
import { extractGitHubRepository } from "../src/github.js";
import { generateRoastPackets } from "../src/openai.js";
import { generateGrokRoastPackets } from "../src/openrouter.js";
import { researchPublicPerception } from "../src/tavily.js";
import { generateOllamaRoastPackets } from "./ollama.mjs";
import { loadReferenceSignals } from "./reference-signals.mjs";
import { buildScenario, INPUT_PROFILES } from "./scenarios.mjs";
import { blindReviewMarkdown, scorePackets } from "./scorers.mjs";

function parseArgs(args) {
  const options = { providers: ["fallback", "gpt", "grok"], profiles: INPUT_PROFILES, count: 6, treatment: "Funny / Roast", instructions: "", outputRoot: "data/eval-runs", referenceStrength: "light" };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    const next = () => args[++index] || "";
    if (value === "--repo") options.repositoryUrl = next();
    else if (value === "--providers") options.providers = next().split(",").filter(Boolean);
    else if (value === "--profiles") options.profiles = next().split(",").filter(Boolean);
    else if (value === "--count") options.count = Math.min(Math.max(Number(next()) || 6, 1), 20);
    else if (value === "--treatment") options.treatment = next();
    else if (value === "--instructions") options.instructions = next();
    else if (value === "--reference-strength") options.referenceStrength = next();
    else if (value === "--out") options.outputRoot = next();
    else if (value === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!["light", "medium", "strong"].includes(options.referenceStrength)) throw new Error("--reference-strength must be light, medium, or strong.");
  return options;
}

function usage() {
  return `Usage: npm run evals -- --repo https://github.com/owner/repo [options]\n\nOptions:\n  --providers fallback,gpt,grok,openrouter:provider/model,ollama,ollama:model\n  --profiles repo_only,repo_plus_perception,repo_plus_reference_signals,repo_plus_reference_sources,full_context\n  --reference-strength light|medium|strong\n  --count 1-20\n  --instructions "creator direction"\n  --out data/eval-runs`;
}

async function generate(provider, project, config, count, fetchImpl) {
  if (provider === "fallback") return { provider, model: "deterministic-fallback", ...(await generateRoastPackets(project, { count })) };
  if (provider === "gpt") {
    if (!config.openaiApiKey) return { provider, skipped: "OPENAI_API_KEY is unavailable" };
    const result = await generateRoastPackets(project, { apiKey: config.openaiApiKey, count, fetchImpl });
    return { provider, model: "gpt-5.6-luna", ...result };
  }
  if (provider === "grok" || provider.startsWith("openrouter:")) {
    if (!config.openrouterApiKey) return { provider, skipped: "OPENROUTER_API_KEY is unavailable" };
    const model = provider === "grok" ? undefined : provider.slice("openrouter:".length);
    const result = await generateGrokRoastPackets(project, { apiKey: config.openrouterApiKey, model, count, fetchImpl });
    return { provider, ...result };
  }
  if (provider === "ollama" || provider.startsWith("ollama:")) {
    const model = provider === "ollama" ? config.ollamaModel : provider.slice("ollama:".length);
    const ollamaFetch = (url, request = {}) => fetch(url, { ...request, signal: request.signal || AbortSignal.timeout(config.ollamaTimeoutMs) });
    const result = await generateOllamaRoastPackets(project, { baseUrl: config.ollamaBaseUrl, model, count, fetchImpl: ollamaFetch });
    return { provider, ...result };
  }
  return { provider, skipped: "Unknown provider" };
}

export async function runBench(options, dependencies = {}) {
  const config = dependencies.config || getOptionalConfig();
  const fetchImpl = dependencies.fetchImpl || ((url, request = {}) => fetch(url, { ...request, signal: request.signal || AbortSignal.timeout(60_000) }));
  const repositoryPack = await (dependencies.extractRepository || extractGitHubRepository)(options.repositoryUrl, { token: config.githubToken, fetchImpl });
  const usesPerception = options.profiles.some((profile) => profile === "repo_plus_perception" || profile === "full_context");
  let perceptionPack = { mode: "not_requested", message: "Perception research was not requested by these benchmark profiles.", evidence: [], perception: [] };
  if (usesPerception) {
    try {
      perceptionPack = await (dependencies.researchPerception || researchPublicPerception)({
      repositoryName: repositoryPack.facts.repository,
      repositoryUrl: options.repositoryUrl,
      apiKey: config.tavilyApiKey,
      fetchImpl,
      });
    } catch (error) {
      perceptionPack = { mode: "failed", message: `Perception research failed: ${error.message}`, evidence: [], perception: [] };
    }
  }
  const referenceSignals = await (dependencies.referenceSignals || loadReferenceSignals)();
  const results = [];
  for (const profile of options.profiles) {
    const scenario = buildScenario({ repositoryPack, perceptionPack, profile, referenceSignals, referenceStrength: options.referenceStrength, treatment: options.treatment, instructions: options.instructions });
    for (const provider of options.providers) {
      let generated;
      try {
        generated = await generate(provider, scenario.project, config, options.count, fetchImpl);
      } catch (error) {
        results.push({ runId: `${profile}__${provider}`, profile, provider, sourceMix: scenario.sourceMix, failed: error.message });
        continue;
      }
      if (generated.skipped) {
        results.push({ runId: `${profile}__${provider}`, profile, provider, sourceMix: scenario.sourceMix, skipped: generated.skipped });
        continue;
      }
      results.push({
        runId: `${profile}__${provider}`,
        profile,
        provider,
        model: generated.model || generated.mode,
        mode: generated.mode,
        usage: generated.usage || null,
        sourceMix: scenario.sourceMix,
        metrics: scorePackets(generated.packets, scenario.project.researchPack.evidence),
        packets: generated.packets,
      });
    }
  }
  return { repositoryPack, perceptionPack, referenceSignals, results };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.repositoryUrl) {
    console.log(usage());
    process.exitCode = options.help ? 0 : 1;
    return;
  }
  const report = await runBench(options);
  const runDirectory = path.resolve(options.outputRoot, new Date().toISOString().replace(/[:.]/g, "-"));
  await mkdir(runDirectory, { recursive: true });
  const manifest = {
    generatedAt: new Date().toISOString(),
    options,
    repository: report.repositoryPack.facts,
    perception: { mode: report.perceptionPack.mode, evidenceCount: report.perceptionPack.evidence.length },
    referenceSignals: report.referenceSignals,
  };
  await Promise.all([
    writeFile(path.join(runDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`),
    writeFile(path.join(runDirectory, "results.json"), `${JSON.stringify(report.results, null, 2)}\n`),
    writeFile(path.join(runDirectory, "blind-review.md"), blindReviewMarkdown(report.results.filter((result) => !result.skipped && !result.failed))),
  ]);
  const compact = report.results.map(({ runId, profile, provider, model, skipped, failed, metrics }) => ({ runId, profile, provider, model, skipped, failed, ...metrics }));
  console.log(JSON.stringify({ runDirectory, results: compact }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
