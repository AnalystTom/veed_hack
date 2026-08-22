import assert from "node:assert/strict";
import test from "node:test";
import { reviewCsv } from "../evals/reviewer-server.mjs";

test("reviewer writes one stable scorecard row per blind candidate", () => {
  const csv = reviewCsv({ "candidate-b": { decision: "keep", rank: "1", reason: "funny, specific", mechanics: "specificity|callback" } }, 2);
  const lines = csv.trim().split("\n");
  assert.equal(lines.length, 3);
  assert.match(lines[1], /^candidate-a,packet-1/);
  assert.match(lines[2], /^candidate-b,packet-1,keep,1,"funny, specific"/);
});
