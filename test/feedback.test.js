import assert from "node:assert/strict";
import test from "node:test";
import { compileFeedback, parseCsv } from "../evals/feedback.mjs";

test("feedback compiler resolves review ordinals and creates provider preference pairs", () => {
  const reviews = parseCsv("run_id,packet_id,decision,rank,reason,notes\na,packet-1,keep,1,best,\nb,packet-1,reject,2,generic,\n");
  const compiled = compileFeedback([{
    id: "matrix",
    reviews,
    results: [
      { runId: "a", provider: "gpt", model: "gpt", profile: "repo_only", metrics: { meanSeconds: 40, passRate: 1 }, packets: [{ id: "actual-a", title: "A", angle: "A" }] },
      { runId: "b", provider: "grok", model: "grok", profile: "repo_only", metrics: { meanSeconds: 60, passRate: 0 }, packets: [{ id: "actual-b", title: "B", angle: "B" }] },
    ],
  }]);
  assert.equal(compiled.records[0].packetId, "actual-a");
  assert.equal(compiled.leaderboard[0].provider, "gpt");
  assert.equal(compiled.pairs.length, 1);
  assert.equal(compiled.pairs[0].chosen.packetId, "actual-a");
  assert.equal(compiled.leaderboard[0].pairwiseScore, 100);
  assert.deepEqual(compiled.leaderboard[0].pairwiseInterval95, { lower: 20.7, upper: 100 });
});

test("feedback compiler records tied ranks without making a training preference", () => {
  const reviews = parseCsv("run_id,packet_id,decision,rank,reason\na,packet-1,keep,1,draw\nb,packet-1,keep,1,draw\n");
  const compiled = compileFeedback([{
    id: "matrix",
    reviews,
    results: [
      { runId: "a", provider: "gpt", model: "gpt", profile: "repo_only", metrics: {}, packets: [{ id: "a", title: "A", angle: "A" }] },
      { runId: "b", provider: "grok", model: "grok", profile: "repo_only", metrics: {}, packets: [{ id: "b", title: "B", angle: "B" }] },
    ],
  }]);
  assert.equal(compiled.comparisons[0].outcome, "tie");
  assert.equal(compiled.pairs.length, 0);
  assert.equal(compiled.leaderboard[0].pairwiseScore, 50);
});

test("feedback compiler resolves opaque candidate aliases from the blind review", () => {
  const reviews = parseCsv("run_id,packet_id,decision,rank,reason\ncandidate-b,packet-1,keep,1,best\n");
  const compiled = compileFeedback([{
    id: "matrix",
    reviews,
    results: [
      { runId: "revealing-a", provider: "gpt", model: "gpt", profile: "repo_only", metrics: {}, packets: [{ id: "a", title: "A", angle: "A" }] },
      { runId: "revealing-b", provider: "grok", model: "grok", profile: "repo_only", metrics: {}, packets: [{ id: "b", title: "B", angle: "B" }] },
    ],
  }]);
  assert.equal(compiled.records[0].runId, "revealing-b");
  assert.equal(compiled.records[0].packetId, "b");
});

test("feedback compiler keeps blind aliases aligned when an earlier generation failed", () => {
  const reviews = parseCsv("run_id,packet_id,decision,rank,reason\ncandidate-b,packet-1,keep,1,best\n");
  const compiled = compileFeedback([{
    id: "matrix",
    reviews,
    results: [
      { runId: "first", provider: "production", model: "luna", profile: "production_comedy", metrics: {}, script: "First script" },
      { runId: "failed", provider: "production", model: "luna", profile: "production_comedy", failed: "no text" },
      { runId: "second", provider: "production", model: "luna", profile: "production_comedy", metrics: {}, script: "Second script" },
    ],
  }]);
  assert.equal(compiled.records[0].runId, "second");
  assert.equal(compiled.records[0].packetId, "packet-1");
});
