import assert from "node:assert/strict";
import test from "node:test";
import { createFallbackRoastPackets, evaluateRoastPacket } from "../src/roastbench.js";

const evidence = [
  { id: "repo:metadata", kind: "repository_metadata" },
  { id: "repo:tree", kind: "file_tree" },
  { id: "web:1", kind: "public_discussion" },
];

test("fallback candidate packets are evidence-linked and pass baseline gates", () => {
  const packets = createFallbackRoastPackets({
    repositorySummary: "acme/widget is a small JavaScript repository.",
    evidence,
    perception: [{ sourceEvidenceId: "web:1", stance: "criticism" }],
    treatment: "Funny / Roast",
    count: 12,
  });
  assert.equal(packets.length, 12);
  const evaluation = evaluateRoastPacket(packets[0], evidence);
  assert.equal(evaluation.status, "passed");
  assert.equal(evaluation.gates.claimGrounding, true);
});

test("RoastBench blocks a sourced claim without evidence", () => {
  const evaluation = evaluateRoastPacket({
    lines: [{ text: "This is allegedly factual.", type: "sourced_observation", evidenceIds: [] }],
    visualEvidenceIds: [],
  }, evidence);
  assert.equal(evaluation.status, "needs_revision");
  assert.equal(evaluation.gates.claimGrounding, false);
});

test("RoastBench blocks comedy that claims to be confirmed fact", () => {
  const evaluation = evaluateRoastPacket({
    lines: [{ text: "Confirmed: this joke is true.", type: "comedic_invention", evidenceIds: [] }],
    visualEvidenceIds: [],
  }, evidence);
  assert.equal(evaluation.gates.framingHonesty, false);
});
