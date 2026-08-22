import { fal } from "@fal-ai/client";
import { config } from "dotenv";
import path from "node:path";

const envPath = path.basename(process.cwd()) === "web"
  ? path.resolve(process.cwd(), "../.env")
  : path.resolve(process.cwd(), ".env");
config({ path: envPath, override: false });

function requireHttpsUrl(rawValue, label) {
  let url;
  try {
    url = new URL(String(rawValue || "").trim());
  } catch {
    throw new Error(`${label} must be a public HTTPS URL.`);
  }
  if (url.protocol !== "https:") throw new Error(`${label} must be a public HTTPS URL.`);
  return url.toString();
}

async function defaultSubscribe(model, options) {
  if (!process.env.FAL_KEY) {
    throw new Error("FAL_KEY is missing from the server environment.");
  }
  return fal.subscribe(model, options);
}

export async function generateApprovedVideo(input, subscribe = defaultSubscribe) {
  if (!input?.approved) throw new Error("The creative package must be approved before generation.");
  const script = String(input.script || "").trim();
  if (!script) throw new Error("An approved narration script is required.");
  if (script.length > 5000) throw new Error("The narration script must be 5,000 characters or fewer.");
  const voiceReferenceUrl = requireHttpsUrl(input.voiceReferenceUrl, "The licensed voice reference");
  const presenterImageUrl = requireHttpsUrl(input.presenterImageUrl, "The licensed presenter image");

  const narration = await subscribe("fal-ai/chatterbox/text-to-speech", {
    input: { text: script, audio_url: voiceReferenceUrl },
    logs: true,
  });
  const audioUrl = narration?.data?.audio?.url;
  if (!audioUrl) throw new Error("Narration generation completed without an audio URL.");

  const presenter = await subscribe("veed/fabric-1.0", {
    input: { image_url: presenterImageUrl, audio_url: audioUrl, resolution: "480p" },
    logs: true,
  });
  const videoUrl = presenter?.data?.video?.url;
  if (!videoUrl) throw new Error("VEED Fabric completed without a video URL.");

  return { audioUrl, videoUrl };
}
