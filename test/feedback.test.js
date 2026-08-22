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
});
