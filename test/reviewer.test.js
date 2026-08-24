import assert from "node:assert/strict";
import test from "node:test";
import { buildPairs, reviewCsv, rotatePairs } from "../evals/reviewer-server.mjs";

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

test("pair reviewer rotates challengers instead of leaving Option B static", () => {
  const candidates = ["a", "b", "c", "d", "e"].map((id) => ({ id: `candidate-${id}`, script: id }));
  const pairs = buildPairs(candidates);
  assert.equal(pairs.length, 10);
  assert.equal(pairs.every((pair, index) => index === 0 || pair.right.id !== pairs[index - 1].right.id), true);
  assert.deepEqual(rotatePairs(pairs), pairs);
});

test("cross-source-only drops same-product matchups but keeps every cross-product pair", () => {
  const candidates = [
    { id: "candidate-a", script: "A", sourceBundle: "cursor" },
    { id: "candidate-b", script: "B", sourceBundle: "cursor" },
    { id: "candidate-c", script: "C", sourceBundle: "replit" },
    { id: "candidate-d", script: "D", sourceBundle: "replit" },
  ];
  const all = buildPairs(candidates);
  const cross = buildPairs(candidates, { crossSourceOnly: true });
  assert.equal(all.length, 6);
  // Only the four cursor×replit pairings survive; a×b and c×d are excluded.
  assert.equal(cross.length, 4);
  const sameBundle = (pair) => {
    const source = (id) => candidates.find((candidate) => candidate.id === id).sourceBundle;
    return source(pair.left.id) === source(pair.right.id);
  };
  assert.equal(cross.some(sameBundle), false);
});

test("cross-source-only defaults off and is a no-op without sourceBundle", () => {
  const candidates = [{ id: "candidate-a", script: "A" }, { id: "candidate-b", script: "B" }, { id: "candidate-c", script: "C" }];
  assert.equal(buildPairs(candidates, { crossSourceOnly: true }).length, 3);
});
