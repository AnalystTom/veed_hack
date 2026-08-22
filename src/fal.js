import { fal } from "@fal-ai/client";
import { requireFalKey } from "./config.js";

export async function generateImage(prompt) {
  requireFalKey();

  if (!prompt?.trim()) {
    throw new Error("A non-empty image prompt is required.");
  }

  return fal.subscribe("fal-ai/flux/schnell", {
    input: { prompt },
    logs: true,
    onQueueUpdate: ({ status }) => console.log(`Fal image status: ${status}`),
  });
}
