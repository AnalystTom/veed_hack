import "dotenv/config";

export function requireFalKey() {
  if (!process.env.FAL_KEY) {
    throw new Error("FAL_KEY is missing. Copy .env.example to .env and add your Fal API key.");
  }
}
