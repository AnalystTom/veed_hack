import assert from "node:assert/strict";
import test from "node:test";
import { buildPairs, reviewCsv } from "../evals/reviewer-server.mjs";

test("reviewer writes one stable scorecard row per blind candidate", () => {
  const csv = reviewCsv({ "candidate-b": { decision: "keep", rank: "1", reason: "funny, specific", mechanics: "specificity|callback" } }, 2);
  const lines = csv.trim().split("\n");
  assert.equal(lines.length, 3);
  assert.match(lines[1], /^candidate-a,packet-1/);
  assert.match(lines[2], /^candidate-b,packet-1,keep,1,"funny, specific"/);
});

test("pair reviewer produces every candidate matchup with a stable hidden orientation", () => {
  const candidates = [{ id: "candidate-a", script: "A" }, { id: "candidate-b", script: "B" }, { id: "candidate-c", script: "C" }];
  const first = buildPairs(candidates);
  const second = buildPairs(candidates);
  assert.equal(first.length, 3);
  assert.deepEqual(first, second);
  assert.equal(first.every((pair) => pair.left.id !== pair.right.id), true);
});
