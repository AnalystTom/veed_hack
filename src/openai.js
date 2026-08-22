import { createFallbackRoastPackets } from "./roastbench.js";

export const PACKET_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["packets"],
  properties: {
    packets: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "angle", "treatment", "narratorDirection", "lines", "visualEvidenceIds", "riskNote"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          angle: { type: "string" },
          treatment: { type: "string" },
          narratorDirection: { type: "string" },
          lines: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["text", "type", "evidenceIds"],
              properties: {
                text: { type: "string" },
                type: { type: "string", enum: ["sourced_observation", "perception_framing", "comedic_invention"] },
                evidenceIds: { type: "array", items: { type: "string" } },
              },
            },
          },
          visualEvidenceIds: { type: "array", items: { type: "string" } },
          riskNote: { type: "string" },
        },
      },
    },
  },
};

export function promptFor(project, count) {
  const evidence = project.researchPack.evidence.map(({ id, kind, title, excerpt, claimableFact }) => ({
    id,
    kind,
    title,
    excerpt: excerpt?.slice(0, 1_000),
    claimableFact,
  }));
  return `Create ${count} genuinely distinct short Roast Packets for a public repository.
Treatment: ${project.treatment}. Creator instructions: ${project.instructions || "none"}.

Rules:
- Never imitate or name a real comedian. Use an original host direction.
- A sourced_observation must cite evidence IDs that directly support it.
- A perception_framing must attribute a public reaction as a reaction, not assert it as fact.
- A comedic_invention is allowed but must not pretend to be a fact.
- Visual evidence IDs must refer only to the supplied evidence.
- Produce concise 30–60 second candidates with genuinely distinct angles.

Repository summary:
${project.repositoryPack.summary}

Evidence:
${JSON.stringify(evidence)}`;
}

export async function generateRoastPackets(project, { apiKey, count = 12, fetchImpl = fetch }) {
  if (!apiKey) {
    return {
      mode: "fallback",
      packets: createFallbackRoastPackets({
        repositorySummary: project.repositoryPack.summary,
        evidence: project.researchPack.evidence,
        perception: project.researchPack.perception,
        treatment: project.treatment,
        count,
      }),
    };
  }
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5.6-luna",
      reasoning: { effort: "low" },
      input: promptFor(project, count),
      text: { format: { type: "json_schema", name: "roast_packets", strict: true, schema: PACKET_SCHEMA } },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI candidate generation failed (${response.status}).`);
  const payload = await response.json();
  const outputText = payload.output_text || payload.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  if (!outputText) throw new Error("OpenAI returned no structured roast packets.");
  return { mode: "live", packets: JSON.parse(outputText).packets };
}
