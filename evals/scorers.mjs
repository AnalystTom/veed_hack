import { evaluateRoastPacket } from "../src/roastbench.js";

function normalise(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function scorePackets(packets, evidence) {
  const evaluations = packets.map((packet) => evaluateRoastPacket(packet, evidence));
  const lines = packets.flatMap((packet) => packet.lines || []);
  const sourcedLines = lines.filter((line) => line.type === "sourced_observation").length;
  const perceptionLines = lines.filter((line) => line.type === "perception_framing").length;
  const angles = new Set(packets.map((packet) => normalise(packet.angle)).filter(Boolean));
  return {
    candidateCount: packets.length,
    passedCount: evaluations.filter((evaluation) => evaluation.status === "passed").length,
    passRate: packets.length ? Number((evaluations.filter((evaluation) => evaluation.status === "passed").length / packets.length).toFixed(3)) : 0,
    meanWords: packets.length ? Math.round(evaluations.reduce((sum, evaluation) => sum + evaluation.wordCount, 0) / packets.length) : 0,
    meanSeconds: packets.length ? Math.round(evaluations.reduce((sum, evaluation) => sum + evaluation.estimatedSeconds, 0) / packets.length) : 0,
    sourcedLineRate: lines.length ? Number((sourcedLines / lines.length).toFixed(3)) : 0,
    perceptionLineRate: lines.length ? Number((perceptionLines / lines.length).toFixed(3)) : 0,
    distinctAngleRate: packets.length ? Number((angles.size / packets.length).toFixed(3)) : 0,
    gateIssueCount: evaluations.reduce((sum, evaluation) => sum + evaluation.issues.length, 0),
  };
}

export function blindReviewMarkdown(results) {
  const rows = ["# Blind candidate review", "", "Provider labels are intentionally replaced with run IDs for human ranking.", ""];
  for (const result of results) {
    rows.push(`## ${result.runId}`, "");
    for (const packet of result.packets) {
      rows.push(`### ${packet.title}`, "", ...(packet.lines || []).map((line) => `- ${line.text}`), "");
    }
  }
  return `${rows.join("\n").trim()}\n`;
}
