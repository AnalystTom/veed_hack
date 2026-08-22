import assert from "node:assert/strict";
import test from "node:test";
import { buildScenario } from "../evals/scenarios.mjs";
import { referenceSourceDirection } from "../evals/reference-signals.mjs";
import { scorePackets } from "../evals/scorers.mjs";

const repositoryPack = {
  summary: "owner/repo is a public repository.",
  evidence: [{ id: "repo:metadata", kind: "repository_metadata", claimableFact: "The repository is public." }],
};

test("eval scenarios vary source mixes without duplicating repository evidence", () => {
  const perceptionPack = { mode: "live", message: null, evidence: [{ id: "web:1", kind: "public_discussion" }], perception: [{ sourceEvidenceId: "web:1" }] };
  const repoOnly = buildScenario({ repositoryPack, perceptionPack, profile: "repo_only", referenceSignals: { available: true, message: "pace" }, treatment: "Funny / Roast" });
  const full = buildScenario({ repositoryPack, perceptionPack, profile: "full_context", referenceSignals: { available: true, message: "pace" }, treatment: "Funny / Roast" });
  assert.equal(repoOnly.project.researchPack.evidence.length, 1);
  assert.equal(full.project.researchPack.evidence.length, 2);
  assert.match(full.project.instructions, /pace/);
  assert.deepEqual(full.sourceMix.referenceSources, []);
});

test("reference-source profile keeps transcript sources separate from repository evidence", () => {
  const scenario = buildScenario({
    repositoryPack,
    perceptionPack: { mode: "unavailable", message: null, evidence: [], perception: [] },
    profile: "repo_plus_reference_sources",
    referenceSignals: { available: true, referenceCards: [{ id: "reference:1", sourceUrl: "https://example.com", title: "Authorised", hookExcerpt: "hook", middleExcerpt: "middle", closingExcerpt: "close" }] },
    referenceStrength: "light",
    treatment: "Funny / Roast",
  });
  assert.equal(scenario.project.researchPack.evidence.length, 1);
  assert.equal(scenario.sourceMix.referenceSources.length, 1);
  assert.equal(scenario.sourceMix.referenceStrength, "light");
  assert.match(scenario.project.instructions, /canonical-comedy reference corpus/);
});

test("light reference anchoring samples a bounded subset of the corpus", () => {
  const cards = Array.from({ length: 10 }, (_, index) => ({
    id: `reference:${index + 1}`,
    title: `Reference ${index + 1}`,
    hookExcerpt: "hook",
    middleExcerpt: "middle",
    closingExcerpt: "close",
  }));
  const direction = referenceSourceDirection({ available: true, referenceCards: cards }, "light");
  assert.equal((direction.match(/Opening-source excerpt/g) || []).length, 3);
  assert.match(direction, /light anchoring/);
});

test("eval scorer reports grounding and diversity metrics", () => {
  const evidence = repositoryPack.evidence;
  const metrics = scorePackets([{ angle: "demo", lines: [{ text: "The repository is public.", type: "sourced_observation", evidenceIds: ["repo:metadata"] }], visualEvidenceIds: ["repo:metadata"] }], evidence);
  assert.equal(metrics.passRate, 1);
  assert.equal(metrics.distinctAngleRate, 1);
  assert.equal(metrics.sourcedLineRate, 1);
});
