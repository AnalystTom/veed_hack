import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("shared eval publishing keeps transcript-card excerpts out of the tracked manifest", async () => {
  const source = await readFile("scripts/publish-eval-run.mjs", "utf8");
  assert.match(source, /referenceCards, corpusFiles/);
  assert.match(source, /Only a run beneath data\/eval-runs or data\/production-comedy-runs may be published/);
  assert.match(source, /candidate-\$\{candidateLabel\(index\)\}/);
});
