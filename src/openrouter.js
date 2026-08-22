import { requireOpenRouterKey } from "./config.js";
import { PACKET_SCHEMA, promptFor } from "./openai.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Default Grok model on OpenRouter. Override per-call with `model`.
export const DEFAULT_GROK_MODEL = "x-ai/grok-4.6";

/**
 * Call a Grok model through OpenRouter's chat completions API.
 *
 * @param {object} options
 * @param {Array<{role: string, content: string}>} [options.messages] Full message list.
 * @param {string} [options.prompt] Shortcut for a single user message.
 * @param {string} [options.system] Optional system prompt (prepended).
 * @param {string} [options.model] OpenRouter model id (defaults to Grok 4).
 * @param {number} [options.temperature]
 * @param {number} [options.maxTokens]
 * @param {object} [options.responseFormat] OpenRouter/OpenAI-compatible response format.
 * @param {string} [options.apiKey] Explicit key for server integrations and tests.
 * @param {typeof fetch} [options.fetchImpl]
 * @returns {Promise<{content: string, model: string, usage: object, raw: object}>}
 */
export async function chatWithGrok({
  messages,
  prompt,
  system,
  model = DEFAULT_GROK_MODEL,
  temperature,
  maxTokens,
  responseFormat,
  apiKey: suppliedApiKey,
  fetchImpl = fetch,
} = {}) {
  const apiKey = suppliedApiKey || requireOpenRouterKey();

  const resolvedMessages = messages ? [...messages] : [];
  if (system) {
    resolvedMessages.unshift({ role: "system", content: system });
  }
  if (prompt?.trim()) {
    resolvedMessages.push({ role: "user", content: prompt });
  }

  if (resolvedMessages.length === 0) {
    throw new Error("chatWithGrok requires a `prompt` or a non-empty `messages` array.");
  }

  const body = {
    model,
    messages: resolvedMessages,
  };
  if (temperature !== undefined) body.temperature = temperature;
  if (maxTokens !== undefined) body.max_tokens = maxTokens;
  if (responseFormat !== undefined) body.response_format = responseFormat;

  const response = await fetchImpl(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `OpenRouter request failed (${response.status} ${response.statusText}): ${detail}`,
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content ?? "";

  return {
    content,
    model: data?.model ?? model,
    usage: data?.usage ?? null,
    raw: data,
  };
}

export async function generateGrokRoastPackets(project, { apiKey, count = 12, model = DEFAULT_GROK_MODEL, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is missing. Add it to .env before selecting Grok.");
  const result = await chatWithGrok({
    apiKey,
    fetchImpl,
    model,
    temperature: 0.9,
    messages: [
      {
        role: "system",
        content: "You are an original, dry technical-comedy writer. Never imitate, name, or reproduce any real comedian. Honour all source and framing rules exactly. Return only the requested JSON.",
      },
      { role: "user", content: promptFor(project, count) },
    ],
    responseFormat: {
      type: "json_schema",
      json_schema: { name: "roast_packets", strict: true, schema: PACKET_SCHEMA },
    },
  });
  const packets = JSON.parse(result.content).packets;
  if (!Array.isArray(packets)) throw new Error("OpenRouter Grok returned an invalid roast-packet payload.");
  return { mode: "grok", model: result.model, usage: result.usage, packets };
}
