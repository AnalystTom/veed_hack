import assert from "node:assert/strict";
import test from "node:test";

import {
  buildResearchBrief,
  buildRoastPlan,
  normalizeSubjectUrl,
  researchSubject,
  summarizeRepository,
  synthesizeResearchBrief,
} from "../web/lib/mvp.mjs";

test("buildResearchBrief returns one grounded Markdown brief with public themes", () => {
  const summary = {
    name: "AnalystTom/veed_hack",
    url: "https://github.com/AnalystTom/veed_hack",
    overview: "A research-led parody video experiment.",
    evidence: [
      { id: "activity", label: "Public repository facts", value: "4 stars and 1 fork.", sourceUrl: "https://github.com/AnalystTom/veed_hack" },
      { id: "readme", label: "README excerpt", value: "Build real videos from researched evidence.", sourceUrl: "https://github.com/AnalystTom/veed_hack#readme" },
    ],
  };

  const brief = buildResearchBrief(summary, {
    answer: "Public discussion repeatedly questions whether research-heavy video tools create more workflow than they remove.",
    results: [{ title: "Public discussion", url: "https://example.com/discussion", content: "Creators complain about workflow complexity." }],
  });

  assert.match(brief, /^# AnalystTom\/veed_hack/m);
  assert.match(brief, /## Complaints and drama/);
  assert.match(brief, /workflow complexity/i);
  assert.match(brief, /\[Public discussion\]\(https:\/\/example.com\/discussion\)/);
  assert.doesNotMatch(brief, /undefined|null/);
});

test("buildResearchBrief condenses long source excerpts into top-level findings", () => {
  const longExcerpt = `Creators repeatedly mention a complicated setup process. ${"Raw source detail ".repeat(80)}`;
  const brief = buildResearchBrief({
    name: "Example",
    url: "https://example.com",
    overview: "An example product.",
    evidence: [{ id: "title", label: "Page title", value: longExcerpt, sourceUrl: "https://example.com" }],
  }, {
    answer: "The product is discussed as ambitious. The recurring tension is setup complexity. Irrelevant third sentence.",
    results: [{ title: "Review", url: "https://example.com/review", content: longExcerpt }],
  });
  assert.match(brief, /complicated setup process/i);
  assert.ok(brief.length < 1_500);
  assert.doesNotMatch(brief, /Raw source detail Raw source detail Raw source detail Raw source detail Raw source detail/);
});

test("synthesizeResearchBrief gives Luna all evidence and appends deterministic sources", async () => {
  let prompt = "";
  const brief = await synthesizeResearchBrief({
    name: "Example",
    url: "https://example.com",
    overview: "An example product.",
    evidence: [{ label: "Homepage", value: "The product promises one-click video.", sourceUrl: "https://example.com" }],
  }, {
    answer: "Public discussion focuses on setup friction.",
    results: [{ title: "Review", url: "https://reviews.example/example", content: "Several reviewers mention setup friction." }],
  }, async ({ user }) => {
    prompt = user;
    return "# Example\n\n## Reputation\n\nAn ambitious one-click video pitch.\n\n## Complaints and drama\n\n- Setup friction recurs across public discussion.\n\n## Contradictions\n\n- Promises one click, ships a setup gauntlet.\n\n## Roastable specifics\n\n- The promise and setup tension create the angle.";
  });
  assert.match(prompt, /Several reviewers mention setup friction/);
  assert.match(brief, /Setup friction recurs/);
  assert.match(brief, /## Sources/);
  assert.match(brief, /https:\/\/reviews\.example\/example/);
});

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
  assert.equal(normalizeSubjectUrl(undefined, "clawbench.com").url, "https://clawbench.com/");
  assert.equal(normalizeSubjectUrl(undefined, "www.clawbench.com").url, "https://www.clawbench.com/");
  assert.equal(normalizeSubjectUrl(undefined, "http://clawbench.com").url, "https://clawbench.com/");
});

test("normalizeSubjectUrl rejects credentials and local targets", () => {
  assert.throws(
    () => normalizeSubjectUrl("product", "https://user:pass@example.com"),
    /credentials/i,
  );
  assert.throws(() => normalizeSubjectUrl("product", "https://localhost:3000"), /public/i);
  assert.throws(() => normalizeSubjectUrl("product", "ftp://example.com"), /HTTPS/i);
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
    [{ login: "octocat", contributions: 12, html_url: "https://github.com/octocat" }],
    [{ name: ".env.example", type: "blob", path: ".env.example" }],
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

  assert.equal(authorizationHeaders.length, 7);
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
