import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildSubjectCardSvg, generateApprovedVideo } from "../web/lib/media.mjs";

test("subject card embeds a portable font instead of relying on server fonts", () => {
  const font = readFileSync(new URL("../web/node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf", import.meta.url));
  const svg = buildSubjectCardSvg("AnalystTom/veed_hack", font).toString("utf8");
  assert.match(svg, /<path d="M/);
  assert.doesNotMatch(svg, /<text|font-family|Arial/);
});

test("generateApprovedVideo blocks unapproved or incomplete requests before provider calls", async () => {
  let calls = 0;
  const subscribe = async () => { calls += 1; };

  await assert.rejects(
    generateApprovedVideo({ approved: false, script: "Hello", templateId: "roast" }, { subscribe }),
    /approved/i,
  );
  await assert.rejects(
    generateApprovedVideo({ approved: true, script: "Hello", templateId: "unknown" }, { subscribe }),
    /template/i,
  );
  await assert.rejects(
    generateApprovedVideo({ approved: true, script: "Hello", templateId: "roast" }, { subscribe }),
    /subject name/i,
  );
  await assert.rejects(
    generateApprovedVideo({ approved: true, script: "Hello", templateId: "roast", subjectName: "Demo" }, { subscribe }),
    /subject visual/i,
  );
  assert.equal(calls, 0);
});

test("generateApprovedVideo creates narration before the VEED presenter video", async () => {
  const calls = [];
  const subscribe = async (model, options) => {
    calls.push({ model, input: options.input });
    if (model === "fal-ai/elevenlabs/tts/eleven-v3") {
      return { data: { audio: { url: "https://media.example/narration.wav" } } };
    }
    return { data: { video: { url: "https://media.example/video.mp4" } } };
  };

  const result = await generateApprovedVideo({
    approved: true,
    script: "A short approved script.",
    templateId: "roast",
    subjectVisualUrl: "https://media.example/product.png",
    subjectName: "Example product",
  }, {
    subscribe,
    uploadScene: async (template, input) => {
      assert.equal(template.id, "roast");
      assert.equal(input.subjectVisualUrl, "https://media.example/product.png");
      return "https://media.example/product-presenter-scene.png";
    },
  });

  assert.deepEqual(calls.map((call) => call.model), [
    "fal-ai/elevenlabs/tts/eleven-v3",
    "veed/fabric-1.0",
  ]);
  assert.equal(calls[0].input.voice, "George");
  assert.equal(calls[1].input.audio_url, "https://media.example/narration.wav");
  assert.equal(calls[1].input.image_url, "https://media.example/product-presenter-scene.png");
  assert.equal(calls[1].input.resolution, "480p");
  assert.equal(result.videoUrl, "https://media.example/video.mp4");
  assert.equal(result.templateId, "roast");
});
