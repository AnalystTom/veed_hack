import assert from "node:assert/strict";
import test from "node:test";
import { dedupeCandidates, jaccard, wordSet } from "../scripts/dedupe-arena.mjs";

test("jaccard treats punctuation and casing as noise", () => {
  assert.equal(jaccard(wordSet("Cursor deleted the database."), wordSet("cursor deleted the database")), 1);
});

test("dedupe drops a near-paraphrase but keeps genuinely different jokes", () => {
  const candidates = [
    { runId: "a", script: "Cursor promised ambitious software, then an agent deleted the company database in nine seconds." },
    { runId: "b", script: "Cursor promised ambitious software, then an agent deleted the company database in nine seconds flat." },
    { runId: "c", script: "GitHub Copilot still calls itself your pair programmer, but the pair never clocks in." },
  ];
  const { kept, dropped } = dedupeCandidates(candidates, { threshold: 0.6 });
  assert.deepEqual(kept.map((candidate) => candidate.runId), ["a", "c"]);
  assert.equal(dropped.length, 1);
  assert.equal(dropped[0].runId, "b");
  assert.equal(dropped[0].nearestKept.runId, "a");
});

test("dedupe never removes distinct candidates below threshold", () => {
  const candidates = [
    { runId: "a", script: "Replit skips setup so beginners ship in eight hours." },
    { runId: "b", script: "Hugging Face hosts a million models nobody has evaluated." },
  ];
  const { kept, dropped } = dedupeCandidates(candidates);
  assert.equal(kept.length, 2);
  assert.equal(dropped.length, 0);
});

test("dedupe leaves failed candidates (no script) in place", () => {
  const candidates = [
    { runId: "a", failed: "timeout" },
    { runId: "b", script: "A genuine one-liner about something specific." },
  ];
  const { kept } = dedupeCandidates(candidates);
  assert.equal(kept.length, 2);
});
