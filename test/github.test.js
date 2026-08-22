import assert from "node:assert/strict";
import test from "node:test";
import { buildRepositoryEvidence, parseGitHubRepositoryUrl, selectRepositoryPaths } from "../src/github.js";

test("parseGitHubRepositoryUrl accepts a clean public repository URL", () => {
  assert.deepEqual(parseGitHubRepositoryUrl("https://github.com/AnalystTom/veed_hack.git"), {
    owner: "AnalystTom",
    repository: "veed_hack",
    canonicalUrl: "https://github.com/AnalystTom/veed_hack",
  });
});

test("parseGitHubRepositoryUrl rejects credentials, paths, and other hosts", () => {
  for (const value of [
    "http://github.com/owner/repo",
    "https://user:pass@github.com/owner/repo",
    "https://github.com/owner/repo/issues",
    "https://gitlab.com/owner/repo",
  ]) {
    assert.throws(() => parseGitHubRepositoryUrl(value));
  }
});

test("selectRepositoryPaths favours manifests and source while skipping generated dependencies", () => {
  const selected = selectRepositoryPaths([
    { type: "blob", path: "node_modules/x/index.js", size: 10 },
    { type: "blob", path: "package.json", size: 10 },
    { type: "blob", path: "src/main.js", size: 10 },
    { type: "blob", path: "README.md", size: 10 },
  ]);
  assert.deepEqual(selected.map((entry) => entry.path), ["package.json", "README.md", "src/main.js"]);
});

test("buildRepositoryEvidence creates linked facts and evidence records", () => {
  const result = buildRepositoryEvidence({
    repository: {
      full_name: "acme/widget",
      description: "A widget",
      default_branch: "main",
      pinnedSha: "abc123",
      html_url: "https://github.com/acme/widget",
    },
    tree: [
      { type: "blob", path: "package.json", size: 100 },
      { type: "blob", path: "src/main.js", size: 100 },
    ],
    files: [
      { path: "package.json", content: '{"name":"widget","dependencies":{"express":"1"}}', lineCount: 1 },
      { path: "src/main.js", content: 'import express from "express";', lineCount: 1 },
    ],
  });
  assert.equal(result.facts.repository, "acme/widget");
  assert.ok(result.evidence.some((item) => item.id === "repo:src/main.js:1-1"));
  assert.deepEqual(result.facts.package.dependencies, ["express"]);
});
