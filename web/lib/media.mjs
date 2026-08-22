import { fal } from "@fal-ai/client";
import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { getVideoTemplate } from "./templates.mjs";

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

async function defaultUploadPresenter(template) {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY is missing from the server environment.");
  const publicDirectory = path.basename(process.cwd()) === "web"
    ? path.resolve(process.cwd(), "public")
    : path.resolve(process.cwd(), "web/public");
  const bytes = await readFile(path.join(publicDirectory, "templates", template.imageFileName));
  return fal.storage.upload(new Blob([bytes], { type: "image/png" }));
}

export async function generateNarration(input, subscribe = defaultSubscribe) {
  if (!input?.approved) throw new Error("The creative package must be approved before generation.");
  const script = String(input.script || "").trim();
  if (!script) throw new Error("An approved narration script is required.");
  if (script.length > 5000) throw new Error("The narration script must be 5,000 characters or fewer.");
  const template = getVideoTemplate(input.templateId);
  const narration = await subscribe("fal-ai/elevenlabs/tts/eleven-v3", {
    input: {
      text: script,
      voice: template.voice,
      stability: 0.5,
      language_code: "en",
      apply_text_normalization: "auto",
    },
    logs: true,
  });
  const audioUrl = narration?.data?.audio?.url;
  if (!audioUrl) throw new Error("Narration generation completed without an audio URL.");
  return { audioUrl, templateId: template.id, requestId: narration.requestId || null };
}

export async function generatePresenterVideo(input, adapters = {}) {
  if (!input?.approved) throw new Error("The creative package must be approved before generation.");
  const template = getVideoTemplate(input.templateId);
  const audioUrl = requireHttpsUrl(input.audioUrl, "The generated narration");
  const uploadPresenter = adapters.uploadPresenter || defaultUploadPresenter;
  const subscribe = adapters.subscribe || defaultSubscribe;
  const presenterImageUrl = requireHttpsUrl(await uploadPresenter(template), "The template presenter image");
  const presenter = await subscribe("veed/fabric-1.0", {
    input: { image_url: presenterImageUrl, audio_url: audioUrl, resolution: "480p" },
    logs: true,
  });
  const videoUrl = presenter?.data?.video?.url;
  if (!videoUrl) throw new Error("VEED Fabric completed without a video URL.");
  return { videoUrl, templateId: template.id, requestId: presenter.requestId || null };
}

export async function generateApprovedVideo(input, adapters = {}) {
  const subscribe = adapters.subscribe || defaultSubscribe;
  const narration = await generateNarration(input, subscribe);
  const video = await generatePresenterVideo({ ...input, audioUrl: narration.audioUrl }, {
    subscribe,
    uploadPresenter: adapters.uploadPresenter,
  });
  return { audioUrl: narration.audioUrl, videoUrl: video.videoUrl, templateId: video.templateId };
}
