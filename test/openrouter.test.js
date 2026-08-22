import assert from "node:assert/strict";
import test from "node:test";
import { generateGrokRoastPackets } from "../src/openrouter.js";

const project = {
  treatment: "Funny / Roast",
  instructions: "",
  repositoryPack: { summary: "acme/widget is a small JavaScript repository." },
  researchPack: {
    evidence: [{ id: "repo:metadata", kind: "repository_metadata", title: "Metadata", excerpt: "", claimableFact: "The repository is public." }],
  },
};

test("Grok challenger sends a schema-constrained OpenRouter request", async () => {
  let request;
  const result = await generateGrokRoastPackets(project, {
    apiKey: "test-key",
    count: 1,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({
        model: "x-ai/grok-4.6",
        choices: [{ message: { content: JSON.stringify({ packets: [{ id: "grok-1", title: "Take", angle: "angle", treatment: "Funny / Roast", narratorDirection: "original", lines: [], visualEvidenceIds: [], riskNote: "none" }] }) } }],
      }), { status: 200 });
    },
  });
  const body = JSON.parse(request.options.body);
  assert.equal(request.url, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(body.model, "x-ai/grok-4.6");
  assert.equal(body.response_format.type, "json_schema");
  assert.equal(result.mode, "grok");
  assert.equal(result.packets.length, 1);
});
