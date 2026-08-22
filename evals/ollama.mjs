import { PACKET_SCHEMA, promptFor } from "../src/openai.js";

function endpoint(baseUrl) {
  return `${String(baseUrl).replace(/\/+$/, "")}/chat/completions`;
}

export async function generateOllamaRoastPackets(project, { baseUrl, model, count = 12, fetchImpl = fetch } = {}) {
  if (!baseUrl) throw new Error("OLLAMA_BASE_URL is missing. Set it to an OpenAI-compatible /v1 endpoint.");
  if (!model) throw new Error("OLLAMA_MODEL is missing. Set it to the local Ollama model id.");
  const response = await fetchImpl(endpoint(baseUrl), {
    method: "POST",
    headers: { Authorization: "Bearer ollama", "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      stream: false,
      messages: [
        { role: "system", content: "You are an original, dry technical-comedy writer. Never imitate, name, or reproduce any real comedian. Honour all source and framing rules exactly. Return only the requested JSON." },
        { role: "user", content: promptFor(project, count) },
      ],
      response_format: { type: "json_schema", json_schema: { name: "roast_packets", strict: true, schema: PACKET_SCHEMA } },
    }),
  });
  if (!response.ok) throw new Error(`Ollama generation failed (${response.status}).`);
  const payload = await response.json();
  const outputText = payload.choices?.[0]?.message?.content;
  if (!outputText) throw new Error("Ollama returned no roast packets.");
  const packets = JSON.parse(outputText).packets;
  if (!Array.isArray(packets)) throw new Error("Ollama returned an invalid roast-packet payload.");
  return { mode: "ollama", model: payload.model || model, usage: payload.usage || null, packets };
}
