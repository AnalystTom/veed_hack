import assert from "node:assert/strict";
import test from "node:test";
import { generateOllamaRoastPackets } from "../evals/ollama.mjs";

const project = {
  treatment: "Funny / Roast",
  instructions: "",
  repositoryPack: { summary: "acme/widget is a public repository." },
  researchPack: { evidence: [{ id: "repo:metadata", kind: "repository_metadata", title: "Metadata", excerpt: "", claimableFact: "The repository is public." }] },
};

test("Ollama challenger uses the OpenAI-compatible endpoint and schema", async () => {
  let request;
  const result = await generateOllamaRoastPackets(project, {
    baseUrl: "http://ollama.test:11434/v1/",
    model: "qwen-test",
    count: 1,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ model: "qwen-test", choices: [{ message: { content: JSON.stringify({ packets: [] }) } }] }), { status: 200 });
    },
  });
  const body = JSON.parse(request.options.body);
  assert.equal(request.url, "http://ollama.test:11434/v1/chat/completions");
  assert.equal(body.model, "qwen-test");
  assert.equal(body.response_format.type, "json_schema");
  assert.equal(result.mode, "ollama");
});
