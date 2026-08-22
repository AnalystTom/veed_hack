import { fal } from "@fal-ai/client";
import { requireFalKey } from "./config.js";

function requireUrl(value, label) {
  try {
    return new URL(value).toString();
  } catch {
    throw new Error(`${label} must be an absolute URL.`);
  }
}

export async function createFabricVideo({ imageUrl, audioUrl, resolution = "720p" }) {
  requireFalKey();

  return fal.subscribe("veed/fabric-1.0", {
    input: {
      image_url: requireUrl(imageUrl, "imageUrl"),
      audio_url: requireUrl(audioUrl, "audioUrl"),
      resolution,
    },
    logs: true,
    onQueueUpdate: ({ status }) => console.log(`VEED Fabric status: ${status}`),
  });
}

export async function lipSyncVideo({ videoUrl, audioUrl }) {
  requireFalKey();

  return fal.subscribe("veed/lipsync", {
    input: {
      video_url: requireUrl(videoUrl, "videoUrl"),
      audio_url: requireUrl(audioUrl, "audioUrl"),
    },
    logs: true,
    onQueueUpdate: ({ status }) => console.log(`VEED Lip Sync status: ${status}`),
  });
}
