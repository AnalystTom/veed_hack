import assert from "node:assert/strict";
import test from "node:test";
import { requireFalKey } from "../src/config.js";

const originalFalKey = process.env.FAL_KEY;

test("requireFalKey reports a missing key without exposing a secret", async () => {
  delete process.env.FAL_KEY;
  assert.throws(() => requireFalKey(), /FAL_KEY is missing/);
  if (originalFalKey === undefined) {
    delete process.env.FAL_KEY;
  } else {
    process.env.FAL_KEY = originalFalKey;
  }
});
