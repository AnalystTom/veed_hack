import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRoastPlan,
  normalizeSubjectUrl,
  summarizeRepository,
} from "../web/lib/mvp.mjs";

test("normalizeSubjectUrl accepts public HTTPS GitHub repositories", () => {
  const subject = normalizeSubjectUrl("repository", "https://github.com/AnalystTom/veed_hack");

  assert.equal(subject.kind, "repository");
  assert.equal(subject.owner, "AnalystTom");
  assert.equal(subject.repo, "veed_hack");
  assert.equal(subject.url, "https://github.com/AnalystTom/veed_hack");
});

test("normalizeSubjectUrl rejects credentials and local targets", () => {
  assert.throws(
    () => normalizeSubjectUrl("product", "https://user:pass@example.com"),
    /credentials/i,
  );
  assert.throws(() => normalizeSubjectUrl("product", "https://localhost:3000"), /public/i);
  assert.throws(() => normalizeSubjectUrl("product", "http://example.com"), /HTTPS/i);
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
  );

  assert.match(summary.overview, /research-led parody video experiment/);
  assert.deepEqual(summary.architecture.directories, ["src", "web"]);
  assert.deepEqual(summary.architecture.files, ["package.json"]);
  assert.equal(summary.evidence.every((item) => item.sourceUrl.includes("github.com")), true);
  assert.equal(summary.evidence.some((item) => item.value.includes("4 stars")), true);
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
  assert.equal(plan.scenes.some((scene) => scene.claimType === "comedic-invention"), true);
  assert.match(plan.disclosure, /parody/i);
});
