import { requireOpenRouterKey } from "./config.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Default Grok model on OpenRouter. Override per-call with `model`.
export const DEFAULT_GROK_MODEL = "x-ai/grok-4.3";

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
 * @returns {Promise<{content: string, model: string, usage: object, raw: object}>}
 */
export async function chatWithGrok({
  messages,
  prompt,
  system,
  model = DEFAULT_GROK_MODEL,
  temperature,
  maxTokens,
} = {}) {
  const apiKey = requireOpenRouterKey();

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

  const response = await fetch(OPENROUTER_URL, {
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
