import { fal } from "@fal-ai/client";
import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import { parse as parseFont } from "opentype.js/dist/opentype.mjs";
import path from "node:path";
import sharp from "sharp";

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

export function buildSubjectCardSvg(subjectName, fontBytes) {
  const cleanName = String(subjectName).slice(0, 55);
  const bytes = Buffer.from(fontBytes);
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const font = parseFont(arrayBuffer);
  const labelPath = font.getPath("TONIGHT'S SUBJECT", 30, 43, 13).toPathData(2);
  const subjectPath = font.getPath(cleanName, 30, 216, 22).toPathData(2);
  return Buffer.from(`<svg width="480" height="246" xmlns="http://www.w3.org/2000/svg"><rect width="480" height="246" fill="#111114" fill-opacity="0.96"/><rect x="12" y="12" width="456" height="222" rx="18" fill="#18181d" stroke="#9f8cff" stroke-width="2"/><path d="${labelPath}" fill="#a99bff"/><path d="${subjectPath}" fill="white"/></svg>`);
}

async function defaultUploadScene(template, input) {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY is missing from the server environment.");
  const publicDirectory = path.basename(process.cwd()) === "web"
    ? path.resolve(process.cwd(), "public")
    : path.resolve(process.cwd(), "web/public");
  const presenterBytes = await readFile(path.join(publicDirectory, "templates", template.imageFileName));
  const fontBytes = await readFile(path.resolve(publicDirectory, "../node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf"));
  const presenter = await sharp(presenterBytes).resize(480, 864, { fit: "cover" }).png().toBuffer();
  let subjectVisual = null;
  if (input.subjectVisualUrl) {
    try {
      const response = await fetch(requireHttpsUrl(input.subjectVisualUrl, "The subject visual"), { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error(`The subject visual returned status ${response.status}.`);
      subjectVisual = Buffer.from(await response.arrayBuffer());
    } catch (error) {
      throw new Error(error instanceof Error ? `The subject visual could not be loaded: ${error.message}` : "The subject visual could not be loaded.");
    }
  }
  const header = buildSubjectCardSvg(input.subjectName, fontBytes);
  const composites = [{ input: header, top: 618, left: 0 }];
  if (subjectVisual) {
    const visual = await sharp(subjectVisual).resize(420, 142, { fit: "cover" }).png().toBuffer();
    composites.push({ input: visual, top: 676, left: 30 });
  }
  const scene = await sharp(presenter).composite(composites).png().toBuffer();
  return fal.storage.upload(new Blob([scene], { type: "image/png" }));
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
  if (!String(input.subjectName || "").trim()) throw new Error("A researched subject name is required for the generated scene.");
  if (!input.subjectVisualUrl && input.subjectVisualMode !== "text-card") {
    throw new Error("A researched subject visual or an explicitly approved text-only subject card is required for the generated scene.");
  }
  const template = getVideoTemplate(input.templateId);
  const audioUrl = requireHttpsUrl(input.audioUrl, "The generated narration");
  const uploadScene = adapters.uploadScene || adapters.uploadPresenter || defaultUploadScene;
  const subscribe = adapters.subscribe || defaultSubscribe;
  const presenterImageUrl = requireHttpsUrl(await uploadScene(template, input), "The template presenter scene");
  const presenter = await subscribe("veed/fabric-1.0", {
    input: { image_url: presenterImageUrl, audio_url: audioUrl, resolution: "480p" },
    logs: true,
  });
  const videoUrl = presenter?.data?.video?.url;
  if (!videoUrl) throw new Error("VEED Fabric completed without a video URL.");
  return { videoUrl, templateId: template.id, requestId: presenter.requestId || null };
}

export async function generateApprovedVideo(input, adapters = {}) {
  if (!input?.approved) throw new Error("The creative package must be approved before generation.");
  getVideoTemplate(input.templateId);
  if (!String(input.subjectName || "").trim()) throw new Error("A researched subject name is required for the generated scene.");
  if (!input.subjectVisualUrl && input.subjectVisualMode !== "text-card") {
    throw new Error("A researched subject visual or an explicitly approved text-only subject card is required for the generated scene.");
  }
  const subscribe = adapters.subscribe || defaultSubscribe;
  const narration = await generateNarration(input, subscribe);
  const video = await generatePresenterVideo({ ...input, audioUrl: narration.audioUrl }, {
    subscribe,
    uploadScene: adapters.uploadScene || adapters.uploadPresenter,
  });
  return { audioUrl: narration.audioUrl, videoUrl: video.videoUrl, templateId: video.templateId };
}
