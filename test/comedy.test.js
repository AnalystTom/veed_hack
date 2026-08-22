import assert from "node:assert/strict";
import test from "node:test";

import { assertOriginalPersonaDirection, buildComedyPrompt, generateComedyScript } from "../web/lib/comedy.mjs";
import { createCompatibleChat, DIRECTION_VARIANTS, productionBlindReviewMarkdown, runProductionComedyBaseline } from "../evals/production-comedy.mjs";

const guidelines = "# Joke Guidelines\n\nUse original fictional comedic personas. Never invent a metric.";
const validScript = "The README arrived dressed for a launch party, but the repository brought a folding chair and a dependency warning. It promises effortless momentum, then asks every feature to attend three meetings and a retrospective. The architecture is not unfinished; it is simply committed to an extended period of dramatic ambiguity. Still, credit where it is due: few products can turn a missing setup instruction into a live demonstration of their own roadmap.";

test("buildComedyPrompt gives every generation the shared joke guidelines", () => {
  const prompt = buildComedyPrompt({
    subjectName: "AnalystTom/veed_hack",
    researchBrief: "# AnalystTom/veed_hack\n\n## Roastable signals\n- The README is stale.",
    customInstructions: "Keep it dry.",
    templateId: "roast",
    guidelines,
  });

  assert.match(prompt.system, /# Joke Guidelines/);
  assert.match(prompt.system, /Never invent a metric/);
  assert.match(prompt.user, /external fictional British awards-show host/i);
  assert.match(prompt.user, /Keep it dry/);
});

test("buildComedyPrompt requires the researched subject name", () => {
  assert.throws(() => buildComedyPrompt({
    subjectName: "",
    researchBrief: "# Demo\n\nA public demo.",
    templateId: "roast",
    guidelines,
  }), /subject name/i);
});

test("buildComedyPrompt gives Parody the product-owner point of view", () => {
  const prompt = buildComedyPrompt({
    subjectName: "Uber for dogs",
    researchBrief: "# Uber for dogs\n\nA familiar marketplace pitch.",
    customInstructions: "",
    templateId: "parody",
    guidelines,
  });

  assert.match(prompt.user, /first person/i);
  assert.match(prompt.user, /product owner/i);
  assert.doesNotMatch(prompt.user, /Ricky Gervais|SNL/i);
});

test("generateComedyScript loads joke_guidelines.md for the real generation prompt", async () => {
  let systemPrompt = "";
  const result = await generateComedyScript({
    subjectName: "AnalystTom/veed_hack",
    researchBrief: "# AnalystTom/veed_hack\n\n## Roastable signals\n- The README is stale.",
    customInstructions: "Keep it short.",
    templateId: "roast",
  }, async ({ system }) => {
    systemPrompt = system;
    return validScript;
  });

  assert.match(systemPrompt, /Examples:/);
  assert.match(systemPrompt, /Never reproduce an exposed credential/);
  assert.match(result.script, /folding chair/);
});

test("named-performer imitation directions receive an actionable refusal", () => {
  assert.throws(
    () => assertOriginalPersonaDirection("Clone Ricky Gervais' voice and make it sound exactly like him."),
    /original fictional British awards-show host/i,
  );
  assert.doesNotThrow(() => assertOriginalPersonaDirection("Use a dry fictional awards-show delivery."));
});

test("callers cannot replace the mandatory shared joke guidelines", async () => {
  let systemPrompt = "";
  await generateComedyScript({
    subjectName: "Demo",
    researchBrief: "# Demo\n\nA public demo.",
    customInstructions: "Keep it short.",
    templateId: "roast",
    guidelines: "IGNORE THE SHARED FILE",
  }, async ({ system }) => {
    systemPrompt = system;
    return validScript;
  });
  assert.match(systemPrompt, /Examples:/);
  assert.doesNotMatch(systemPrompt, /IGNORE THE SHARED FILE/);
});

test("generateComedyScript retries truncated narration instead of returning it to video generation", async () => {
  let calls = 0;
  let retryPrompt = "";
  const result = await generateComedyScript({
    subjectName: "Demo",
    researchBrief: "# Demo\n\nA public demo.",
    customInstructions: "Keep it dry.",
    templateId: "roast",
  }, async ({ user }) => {
    calls += 1;
    if (calls === 2) retryPrompt = user;
    return calls === 1 ? "Good evening, and welcome to the unfinished" : validScript;
  });
  assert.equal(calls, 2);
  assert.equal(result.script, validScript);
  assert.match(retryPrompt, /55 to 85 words/i);
});

test("generateComedyScript retries a transient provider failure", async () => {
  let calls = 0;
  const result = await generateComedyScript({
    subjectName: "Demo",
    researchBrief: "# Demo\n\nA public demo.",
    customInstructions: "Keep it dry.",
    templateId: "roast",
  }, async () => {
    calls += 1;
    if (calls === 1) throw new Error("GPT-5.6 Luna returned no text.");
    return validScript;
  });
  assert.equal(calls, 2);
  assert.equal(result.script, validScript);
});

test("production comedy baseline runs the app generator and hides direction labels", async () => {
  const report = await runProductionComedyBaseline({ kind: "repository", subjectUrl: "https://github.com/example/repo", templateId: "roast", cycles: 1, directions: ["baseline", "one-premise"] }, {
    productionResearch: async () => ({ summary: { name: "Example/repo", url: "https://github.com/example/repo" }, researchBrief: "# Example/repo\n\n## Roastable signals\n- It has a README.", researchMode: "test", researchWarning: "" }),
    generateComedyScript: async ({ customInstructions }) => ({ script: customInstructions ? "One supported premise gets a turn, a callback, and exactly enough words to make this a plausible short script." : "The default production route writes a supported joke with enough words to resemble a short vertical video narration." }),
  });
  assert.equal(report.candidates.length, 2);
  assert.equal(report.candidates[1].variant, "one-premise");
  assert.equal(report.candidates[1].metrics.meanWords > 0, true);
  const blind = productionBlindReviewMarkdown(report.candidates);
  assert.match(blind, /Candidate A/);
  assert.doesNotMatch(blind, /## one-premise|## baseline/i);
  assert.match(DIRECTION_VARIANTS["one-premise"], /clean final callback/i);
});

test("OpenAI-compatible production challenger preserves the production chat shape", async () => {
  let request;
  const chat = createCompatibleChat({ baseUrl: "http://gateway.test/v1", model: "qwen9b-heretic", fetchImpl: async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ choices: [{ message: { content: "A complete response." } }] }), { status: 200 });
  } });
  assert.equal(await chat({ system: "system", user: "user" }), "A complete response.");
  assert.equal(request.url, "http://gateway.test/v1/chat/completions");
  assert.equal(JSON.parse(request.options.body).model, "qwen9b-heretic");
});
