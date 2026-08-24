import assert from "node:assert/strict";
import test from "node:test";
import { buildBrief, buildGoldRecords } from "../scripts/build-gold-seed.mjs";

test("gold seed produces well-formed decoder-SFT records", () => {
  const { records } = buildGoldRecords();
  assert.ok(records.length >= 18, `expected >= 18 gold records, got ${records.length}`);
  for (const record of records) {
    assert.equal(record.messages.length, 2);
    assert.equal(record.messages[0].role, "user");
    assert.equal(record.messages[1].role, "assistant");
    assert.ok(record.messages[0].content.includes(record.meta.subject), "brief names the subject");
    assert.ok(record.messages[0].content.includes("## Output"), "brief states the output constraint");
    assert.ok(record.messages[1].content.trim().length > 0, "assistant line is non-empty");
    assert.equal(record.meta.provenance, "curated human-authored gold seed");
    assert.equal(record.meta.gold, true);
  }
});

test("gold seed has no duplicate assistant lines", () => {
  const { records } = buildGoldRecords();
  const lines = records.map((r) => r.messages[1].content);
  assert.equal(new Set(lines).size, lines.length, "assistant lines must be unique");
});

test("each gold line is a single bit, not a paragraph", () => {
  const { records } = buildGoldRecords();
  for (const record of records) {
    const line = record.messages[1].content;
    const words = line.split(/\s+/).filter(Boolean).length;
    assert.ok(words >= 5 && words <= 35, `"${line}" has ${words} words, outside 5-35`);
    const sentences = line.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length;
    assert.ok(sentences <= 3, `"${line}" reads as ${sentences} sentences (paragraph-shaped)`);
  }
});

test("buildBrief switches perspective for parody vs roast", () => {
  const parody = buildBrief({ subject: "X", mode: "parody", angle: "founder-lore", context: "c" });
  const roast = buildBrief({ subject: "X", mode: "roast", angle: "founder-lore", context: "c" });
  assert.ok(parody.includes("first person"));
  assert.ok(roast.includes("outside voice"));
});
