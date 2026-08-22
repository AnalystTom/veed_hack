import assert from "node:assert/strict";
import test from "node:test";

import { generateApprovedVideo } from "../web/lib/media.mjs";

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
