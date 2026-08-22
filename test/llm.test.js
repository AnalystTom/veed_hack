import assert from "node:assert/strict";
import test from "node:test";

import { generateLunaText } from "../web/lib/llm.mjs";

test("Luna disables reasoning and accepts multipart chat content for short scripts", async () => {
  const originalKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test-key";
  let request;
  try {
    const text = await generateLunaText({ system: "System", user: "User" }, async (_url, options) => {
      request = JSON.parse(options.body);
      return new Response(JSON.stringify({ choices: [{ message: { content: [{ type: "text", text: "A complete script." }] } }] }), { status: 200 });
    });
    assert.equal(text, "A complete script.");
    assert.deepEqual(request.reasoning, { effort: "none" });
  } finally {
    if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalKey;
  }
});
