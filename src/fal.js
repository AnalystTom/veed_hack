import { fal } from "@fal-ai/client";
import { requireFalKey } from "./config.js";

export const CHEAP_IMAGE_MODEL = "fal-ai/flux/schnell";

export async function generateImage(prompt) {
  requireFalKey();

  if (!prompt?.trim()) {
    throw new Error("A non-empty image prompt is required.");
  }

  return fal.subscribe(CHEAP_IMAGE_MODEL, {
    input: {
      prompt,
      image_size: { width: 512, height: 512 },
      num_inference_steps: 1,
      num_images: 1,
      output_format: "jpeg",
    },
    logs: true,
    onQueueUpdate: ({ status }) => console.log(`Fal image status: ${status}`),
  });
}
