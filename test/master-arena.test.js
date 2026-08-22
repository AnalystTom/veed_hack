import assert from "node:assert/strict";
import test from "node:test";
import { buildMasterArena } from "../scripts/build-master-arena.mjs";
import { productionBlindReviewMarkdown } from "../evals/production-comedy.mjs";

test("master arena keeps only valid scripts and hides source labels in the blind sheet", () => {
  const candidates = buildMasterArena([
    { id: "luna", results: [{ runId: "a", provider: "production", model: "luna", script: "One complete script." }, { runId: "failed", failed: "no text" }] },
    { id: "qwen", results: [{ runId: "b", provider: "openai-compatible", model: "qwen9b-heretic", script: "Another complete script." }] },
  ]);
  assert.equal(candidates.length, 2);
  assert.equal(candidates.every((candidate) => candidate.profile === "master_comedy_arena"), true);
  const blind = productionBlindReviewMarkdown(candidates);
  assert.match(blind, /Candidate A/);
  assert.doesNotMatch(blind, /qwen|luna|openai-compatible/i);
});
