import path from "node:path";

import { config } from "dotenv";

const repositoryRoot = path.basename(process.cwd()) === "web"
  ? path.resolve(process.cwd(), "..")
  : process.cwd();
config({ path: path.join(repositoryRoot, ".env"), override: false });

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const LUNA_MODEL = "openai/gpt-5.6-luna";
export const OPUS_MODEL = "anthropic/claude-opus-4.8";

function completionText(content) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content.map((part) => {
    if (typeof part === "string") return part;
    if (typeof part?.text === "string") return part.text;
    if (typeof part?.content === "string") return part.content;
    return "";
  }).join("").trim();
}

async function generateOpenRouterText({ model, modelName, system, user, temperature = 0.3, maxTokens = 900 }, fetchImpl = fetch) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is missing from the server environment.");
  const response = await fetchImpl(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_tokens: maxTokens,
      // This endpoint requires short, directly usable text rather than a
      // reasoning trace for both research and video-script generation.
      reasoning: { effort: "none" },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 500);
    throw new Error(`${modelName} generation failed (${response.status}): ${detail || response.statusText}`);
  }
  const payload = await response.json();
  const choice = payload?.choices?.[0];
  const text = completionText(choice?.message?.content);
  if (!text) throw new Error(`${modelName} returned no text${choice?.finish_reason ? ` (finished: ${choice.finish_reason})` : ""}.`);
  return text;
}

export function generateLunaText({ system, user, temperature = 0.3, maxTokens = 900 }, fetchImpl = fetch) {
  return generateOpenRouterText({ model: LUNA_MODEL, modelName: "GPT-5.6 Luna", system, user, temperature, maxTokens }, fetchImpl);
}

export function generateOpusText({ system, user, temperature = 0.3, maxTokens = 900 }, fetchImpl = fetch) {
  return generateOpenRouterText({ model: OPUS_MODEL, modelName: "Claude Opus 4.8", system, user, temperature, maxTokens }, fetchImpl);
}
