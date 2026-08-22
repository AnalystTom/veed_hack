import assert from "node:assert/strict";
import test from "node:test";

import { generateApprovedVideo } from "../web/lib/media.mjs";

test("generateApprovedVideo blocks unapproved or incomplete requests before provider calls", async () => {
  let calls = 0;
  const subscribe = async () => { calls += 1; };

  await assert.rejects(
    generateApprovedVideo({ approved: false, script: "Hello", voiceReferenceUrl: "https://example.com/voice.wav", presenterImageUrl: "https://example.com/host.png" }, subscribe),
    /approved/i,
  );
  await assert.rejects(
    generateApprovedVideo({ approved: true, script: "Hello", voiceReferenceUrl: "", presenterImageUrl: "https://example.com/host.png" }, subscribe),
    /voice reference/i,
  );
  assert.equal(calls, 0);
});

test("generateApprovedVideo creates narration before the VEED presenter video", async () => {
  const calls = [];
  const subscribe = async (model, options) => {
    calls.push({ model, input: options.input });
    if (model === "fal-ai/chatterbox/text-to-speech") {
      return { data: { audio: { url: "https://media.example/narration.wav" } } };
    }
    return { data: { video: { url: "https://media.example/video.mp4" } } };
  };

  const result = await generateApprovedVideo({
    approved: true,
    script: "A short approved script.",
    voiceReferenceUrl: "https://media.example/licensed-voice.wav",
    presenterImageUrl: "https://media.example/licensed-presenter.png",
  }, subscribe);

  assert.deepEqual(calls.map((call) => call.model), [
    "fal-ai/chatterbox/text-to-speech",
    "veed/fabric-1.0",
  ]);
  assert.equal(calls[1].input.audio_url, "https://media.example/narration.wav");
  assert.equal(result.videoUrl, "https://media.example/video.mp4");
});
