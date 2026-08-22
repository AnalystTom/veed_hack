import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRoastPlan,
  normalizeSubjectUrl,
  researchSubject,
  summarizeRepository,
} from "../web/lib/mvp.mjs";

test("normalizeSubjectUrl accepts public HTTPS GitHub repositories", () => {
  const subject = normalizeSubjectUrl("repository", "https://github.com/AnalystTom/veed_hack");

  assert.equal(subject.kind, "repository");
  assert.equal(subject.owner, "AnalystTom");
  assert.equal(subject.repo, "veed_hack");
  assert.equal(subject.url, "https://github.com/AnalystTom/veed_hack");
});

test("normalizeSubjectUrl infers repository or product from one URL input", () => {
  assert.equal(normalizeSubjectUrl(undefined, "https://github.com/AnalystTom/veed_hack").kind, "repository");
  assert.equal(normalizeSubjectUrl(undefined, "https://example.com").kind, "product");
});

test("normalizeSubjectUrl rejects credentials and local targets", () => {
  assert.throws(
    () => normalizeSubjectUrl("product", "https://user:pass@example.com"),
    /credentials/i,
  );
  assert.throws(() => normalizeSubjectUrl("product", "https://localhost:3000"), /public/i);
  assert.throws(() => normalizeSubjectUrl("product", "http://example.com"), /HTTPS/i);
});

test("researchSubject reads GitHub credentials from the environment", async () => {
  const previousToken = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = "test-token";
  const authorizationHeaders = [];
  const responses = [
    { html_url: "https://github.com/owner/repo", full_name: "owner/repo", description: "Real description", stargazers_count: 1, forks_count: 0, default_branch: "main", license: null },
    {},
    [],
    { content: Buffer.from("# Real README").toString("base64"), encoding: "base64" },
    { content: Buffer.from(JSON.stringify({ scripts: { test: "node --test" } })).toString("base64"), encoding: "base64" },
  ];
  let index = 0;

  try {
    await researchSubject("repository", "https://github.com/owner/repo", async (_url, options) => {
      authorizationHeaders.push(options.headers.Authorization);
      return { ok: true, json: async () => responses[index++] };
    });
  } finally {
    if (previousToken === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = previousToken;
  }

  assert.equal(authorizationHeaders.length, 5);
  assert.equal(authorizationHeaders.every((value) => value === "Bearer test-token"), true);
});

test("summarizeRepository only exposes evidence returned by GitHub", () => {
  const summary = summarizeRepository(
    {
      html_url: "https://github.com/AnalystTom/veed_hack",
      full_name: "AnalystTom/veed_hack",
      description: "A research-led parody video experiment",
      stargazers_count: 4,
      forks_count: 1,
      default_branch: "main",
      license: { spdx_id: "MIT" },
    },
    { JavaScript: 800, TypeScript: 200 },
    [
      { name: "src", type: "dir" },
      { name: "web", type: "dir" },
      { name: "package.json", type: "file" },
    ],
    "# VEED hack\nBuild real videos from researched evidence.",
    {
      type: "module",
      scripts: { test: "node --test", check: "node --check src/index.js" },
      dependencies: { "@fal-ai/client": "^1.9.0", dotenv: "^16.6.1" },
    },
  );

  assert.match(summary.overview, /research-led parody video experiment/);
  assert.deepEqual(summary.architecture.directories, ["src", "web"]);
  assert.deepEqual(summary.architecture.files, ["package.json"]);
  assert.equal(summary.evidence.every((item) => item.sourceUrl.includes("github.com")), true);
  assert.equal(summary.evidence.some((item) => item.value.includes("4 stars")), true);
  assert.equal(summary.evidence.some((item) => item.value.includes("@fal-ai/client")), true);
});

test("buildRoastPlan labels facts and jokes and does not claim media was generated", () => {
  const plan = buildRoastPlan({
    subjectName: "AnalystTom/veed_hack",
    subjectUrl: "https://github.com/AnalystTom/veed_hack",
    persona: "Deadpan tech correspondent",
    customInstructions: "Keep it concise.",
    evidence: [
      {
        id: "description",
        label: "Repository description",
        value: "A research-led parody video experiment",
        sourceUrl: "https://github.com/AnalystTom/veed_hack",
      },
      {
        id: "architecture",
        label: "Repository structure",
        value: "Directories: src, web. Root files: package.json.",
        sourceUrl: "https://github.com/AnalystTom/veed_hack",
      },
    ],
  });

  assert.equal(plan.treatment, "Funny / Roast");
  assert.equal(plan.mediaGenerated, false);
  assert.equal(plan.scenes.length, 3);
  assert.equal(plan.scenes.every((scene) => scene.visual.sourceUrl), true);
  assert.equal(plan.scenes.every((scene) => scene.visual.availability === "unavailable"), true);
  assert.equal(plan.scenes.some((scene) => scene.claimType === "comedic-invention"), true);
  assert.match(plan.disclosure, /parody/i);
});

test("buildRoastPlan changes delivery and jokes with the selected original persona", () => {
  const input = {
    subjectName: "AnalystTom/veed_hack",
    subjectUrl: "https://github.com/AnalystTom/veed_hack",
    customInstructions: "Keep the architecture central.",
    evidence: [{
      id: "architecture",
      label: "Repository structure",
      value: "Directories: src, web.",
      sourceUrl: "https://github.com/AnalystTom/veed_hack",
    }],
  };

  const deadpan = buildRoastPlan({ ...input, persona: "Deadpan tech correspondent" });
  const awards = buildRoastPlan({ ...input, persona: "Dry awards-show host" });

  assert.notEqual(deadpan.script, awards.script);
  assert.match(awards.script, /awards/i);
  assert.match(awards.script, /architecture evidence leads/i);
});
