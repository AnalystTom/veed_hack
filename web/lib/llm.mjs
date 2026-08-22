import path from "node:path";

import { config } from "dotenv";

const repositoryRoot = path.basename(process.cwd()) === "web"
  ? path.resolve(process.cwd(), "..")
  : process.cwd();
config({ path: path.join(repositoryRoot, ".env"), override: false });

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const LUNA_MODEL = "openai/gpt-5.6-luna";

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

export async function generateLunaText({ system, user, temperature = 0.3, maxTokens = 900 }, fetchImpl = fetch) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is missing from the server environment.");
  const response = await fetchImpl(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: LUNA_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_tokens: maxTokens,
      // Luna otherwise may spend the entire short comedy budget on reasoning
      // and return an empty narration.
      reasoning: { effort: "none" },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 500);
    throw new Error(`GPT-5.6 Luna generation failed (${response.status}): ${detail || response.statusText}`);
  }
  const payload = await response.json();
  const choice = payload?.choices?.[0];
  const text = completionText(choice?.message?.content);
  if (!text) throw new Error(`GPT-5.6 Luna returned no text${choice?.finish_reason ? ` (finished: ${choice.finish_reason})` : ""}.`);
  return text;
}
