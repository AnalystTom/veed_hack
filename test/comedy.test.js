import assert from "node:assert/strict";
import test from "node:test";

import { assertOriginalPersonaDirection, buildComedyPrompt, generateComedyScript } from "../web/lib/comedy.mjs";

const guidelines = "# Joke Guidelines\n\nUse original fictional comedic personas. Never invent a metric.";

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
    return "The README has been waiting so long for an update, it now qualifies as legacy infrastructure.";
  });

  assert.match(systemPrompt, /Evaluated tech-scene voice examples/);
  assert.match(systemPrompt, /Never reproduce an exposed credential/);
  assert.match(result.script, /legacy infrastructure/);
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
    return "A small grounded joke.";
  });
  assert.match(systemPrompt, /Evaluated tech-scene voice examples/);
  assert.doesNotMatch(systemPrompt, /IGNORE THE SHARED FILE/);
});
