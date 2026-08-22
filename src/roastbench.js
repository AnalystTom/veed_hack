const ANGLES = [
  "mock-serious architecture awards ceremony",
  "WIRED-style technical teardown",
  "late-night desk correspondent walkthrough",
  "dependency confessional",
  "release-note courtroom drama",
  "developer-experience postmortem",
  "startup demo that got too honest",
  "codebase museum tour",
  "maintainer support-group monologue",
  "feature-versus-complexity showdown",
  "documentation scavenger hunt",
  "the repo's own changelog reading it for filth",
];

function id(prefix, index) {
  return `${prefix}-${index + 1}`;
}

function factsFor(evidence) {
  return evidence.filter((item) => item.kind !== "public_discussion").slice(0, 5);
}

export function createFallbackRoastPackets({ repositorySummary, evidence, perception, treatment, count = 12 }) {
  const factualEvidence = factsFor(evidence);
  const publicEvidence = evidence.filter((item) => item.kind === "public_discussion");
  const fact = factualEvidence[0] || evidence[0];
  const tree = factualEvidence.find((item) => item.kind === "file_tree") || fact;
  return Array.from({ length: Math.min(Math.max(Number(count) || 12, 1), 20) }, (_, index) => {
    const angle = ANGLES[index % ANGLES.length];
    const perceptionItem = perception[index % Math.max(perception.length, 1)];
    const perceptionEvidence = perceptionItem ? evidence.find((item) => item.id === perceptionItem.sourceEvidenceId) : null;
    const lines = [
      {
        text: `Tonight's treatment is ${angle}: ${repositorySummary}`,
        type: "sourced_observation",
        evidenceIds: fact ? [fact.id] : [],
      },
      {
        text: "This repo has the kind of file tree that says simple starter and then hands you a treasure map.",
        type: "comedic_invention",
        evidenceIds: tree ? [tree.id] : [],
      },
      {
        text: perceptionEvidence
          ? `The public conversation has a ${perceptionItem.stance.replace(/_/g, " ")} streak here, so that is a perception to frame rather than a fact to repeat.`
          : "No public-conversation punchline is included until research sources are available.",
        type: perceptionEvidence ? "perception_framing" : "comedic_invention",
        evidenceIds: perceptionEvidence ? [perceptionEvidence.id] : [],
      },
    ];
    return {
      id: id("packet", index),
      title: `Take ${index + 1}: ${angle}`,
      angle,
      treatment,
      narratorDirection: "Original dry, mock-serious technical host. Do not imitate a real person.",
      lines,
      visualEvidenceIds: [fact?.id, tree?.id].filter(Boolean),
      riskNote: perceptionEvidence ? "Keep the public reaction explicitly attributed." : "Research-backed public perception is unavailable.",
    };
  });
}

export function evaluateRoastPacket(packet, evidence, { targetSeconds = 45 } = {}) {
  const evidenceIds = new Set(evidence.map((item) => item.id));
  const issues = [];
  for (const [index, line] of packet.lines.entries()) {
    if (line.type === "sourced_observation" && !line.evidenceIds?.length) {
      issues.push({ gate: "claim_grounding", line: index + 1, message: "A sourced observation needs evidence." });
    }
    for (const evidenceId of line.evidenceIds || []) {
      if (!evidenceIds.has(evidenceId)) issues.push({ gate: "claim_grounding", line: index + 1, message: `Unknown evidence: ${evidenceId}` });
    }
    if (line.type === "comedic_invention" && /according to|proves|confirmed|fact:/i.test(line.text)) {
      issues.push({ gate: "framing_honesty", line: index + 1, message: "Comedy must not masquerade as a verified claim." });
    }
  }
  for (const visualId of packet.visualEvidenceIds || []) {
    if (!evidenceIds.has(visualId)) issues.push({ gate: "visual_grounding", message: `Unknown visual evidence: ${visualId}` });
  }
  const words = packet.lines.flatMap((line) => line.text.split(/\s+/)).filter(Boolean).length;
  const estimatedSeconds = Math.ceil((words / 150) * 60);
  if (estimatedSeconds > targetSeconds * 1.25) {
    issues.push({ gate: "production_readiness", message: `Estimated narration (${estimatedSeconds}s) exceeds target.` });
  }
  return {
    status: issues.length ? "needs_revision" : "passed",
    estimatedSeconds,
    wordCount: words,
    issues,
    gates: {
      schema: true,
      claimGrounding: !issues.some((issue) => issue.gate === "claim_grounding"),
      framingHonesty: !issues.some((issue) => issue.gate === "framing_honesty"),
      visualGrounding: !issues.some((issue) => issue.gate === "visual_grounding"),
      productionReadiness: !issues.some((issue) => issue.gate === "production_readiness"),
    },
  };
}
