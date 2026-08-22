import "dotenv/config";

export function requireFalKey() {
  if (!process.env.FAL_KEY) {
    throw new Error("FAL_KEY is missing. Copy .env.example to .env and add your Fal API key.");
  }
}

export function requireOpenRouterKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is missing. Copy .env.example to .env and add your OpenRouter API key.",
    );
  }
  return key;
}
