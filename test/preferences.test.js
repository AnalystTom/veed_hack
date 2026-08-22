import assert from "node:assert/strict";
import test from "node:test";

import { formatCorpusBlock, formatExamplesBlock, selectCuratedExamples } from "../web/lib/preferences.mjs";

test("selectCuratedExamples returns trimmed lines for the requested template", () => {
  const data = { roast: ["  A sharp line.  ", "", "Another one."], parody: ["Owner voice."] };
  assert.deepEqual(selectCuratedExamples(data, "roast"), ["A sharp line.", "Another one."]);
  assert.deepEqual(selectCuratedExamples(data, "parody"), ["Owner voice."]);
});

test("selectCuratedExamples caps the number of examples and tolerates bad input", () => {
  const data = { roast: ["1", "2", "3", "4", "5"] };
  assert.deepEqual(selectCuratedExamples(data, "roast", 2), ["1", "2"]);
  assert.deepEqual(selectCuratedExamples(null, "roast"), []);
  assert.deepEqual(selectCuratedExamples({}, "missing"), []);
});

test("formatExamplesBlock numbers lines and empties cleanly", () => {
  const block = formatExamplesBlock(["First.", "Second."]);
  assert.match(block, /Match their rhythm/);
  assert.match(block, /1\. First\./);
  assert.match(block, /2\. Second\./);
  assert.equal(formatExamplesBlock([]), "");
  assert.equal(formatExamplesBlock(["   "]), "");
});

test("formatCorpusBlock supplies mechanics without raw transcript dialogue", () => {
  const block = formatCorpusBlock({ mechanics: ["Open on the target."], scriptRecipe: { targetWords: "60-72", shape: "Four turns.", voice: "Original only." } });
  assert.match(block, /Open on the target/);
  assert.match(block, /60-72/);
  assert.equal(formatCorpusBlock({}), "");
});
