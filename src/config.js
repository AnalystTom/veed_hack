import "dotenv/config";

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is missing. Add it to .env before making this provider call.`);
  }
  return value;
}

export function requireFalKey() {
  return requireEnv("FAL_KEY");
}

export function getOptionalConfig() {
  return {
    githubToken: process.env.GITHUB_TOKEN?.trim() || null,
    tavilyApiKey: process.env.TAVILY_API_KEY?.trim() || null,
    openaiApiKey: process.env.OPENAI_API_KEY?.trim() || null,
    openrouterApiKey: process.env.OPENROUTER_API_KEY?.trim() || null,
    pioneerApiKey: process.env.PIONEER_API_KEY?.trim() || null,
    parallelApiKey: process.env.PARALLEL_API_KEY?.trim() || null,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL?.trim() || null,
    ollamaModel: process.env.OLLAMA_MODEL?.trim() || null,
    ollamaTimeoutMs: Math.min(Math.max(Number(process.env.OLLAMA_TIMEOUT_MS) || 240_000, 30_000), 600_000),
  };
}

export function providerStatus() {
  const config = getOptionalConfig();
  return {
    github: Boolean(config.githubToken),
    tavily: Boolean(config.tavilyApiKey),
    openai: Boolean(config.openaiApiKey),
    grok: Boolean(config.openrouterApiKey),
    fal: Boolean(process.env.FAL_KEY?.trim()),
    pioneer: Boolean(config.pioneerApiKey),
  };
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
