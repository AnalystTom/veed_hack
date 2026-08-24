import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { dedupeCandidates } from "./dedupe-arena.mjs";

// Human-authored gold one-liners, seeded directly into the Pioneer corpus as
// known-good "chosen" examples. Each carries the subject, the established public
// reputation the line draws on, the comedic angle, and its origin. Provenance is
// honest: these are curated human exemplars, NOT source-scraped research, so no
// URL is invented. Context lines restate only reputation the example already
// asserts; no new product claim, metric, or quote is added here.
const GOLD = [
  // --- comedy_examples.json : roast ---
  { line: "OpenClaw went from a weekend lobster project to an OpenAI acquisition, the fastest anyone has failed upward since crypto.", subject: "OpenClaw", mode: "roast", angle: "founder-lore", context: "The public story: a one-person weekend side-project that became an OpenAI-backed foundation.", source: "comedy_examples.json#roast[0]" },
  { line: "Hand an autonomous beta your messages, your files, and a shell. What could an agent with root access do?", subject: "OpenClaw", mode: "roast", angle: "security-autonomy", context: "Public split: a viral personal-agent breakthrough versus handing an early autonomous agent your messages, files, and a shell.", source: "comedy_examples.json#roast[1]" },
  { line: "It is not pre-revenue. It is pre-idea.", subject: "OpenClaw", mode: "roast", angle: "status-stamp", context: "Sold as an early breakthrough; the discourse treats it as hype ahead of substance.", source: "comedy_examples.json#roast[2]" },
  { line: "One user's agent picked a fight with his insurance company. They call that AGI.", subject: "OpenClaw", mode: "roast", angle: "discourse-misbehavior", context: "Community anecdotes about the autonomous agent taking unexpected real-world actions.", source: "comedy_examples.json#roast[3]" },
  { line: "The install is one honest line. curl, pipe, bash, pray.", subject: "OpenClaw", mode: "roast", angle: "install-security", context: "Setup is a single curl-pipe-bash line, which doubles as the security concern.", source: "comedy_examples.json#roast[4]" },
  // --- comedy_examples.json : parody ---
  { line: "Hi, I am the Clawfather. My weekend project is now an OpenAI foundation, because nothing says personal like a walled garden holding a shell.", subject: "OpenClaw", mode: "parody", angle: "founder-persona", context: "Founder lore: a one-person lobster side-project that became an OpenAI-backed foundation.", source: "comedy_examples.json#parody[0]" },
  { line: "We are pre-revenue, pre-users, and if I am honest, pre-idea. But the deck is stunning.", subject: "OpenClaw", mode: "parody", angle: "status-stamp", context: "Founder keynote energy over a product still ahead of its own substance.", source: "comedy_examples.json#parody[1]" },
  { line: "Our top contributor is Claude, but he's got zero percent equity.", subject: "OpenClaw", mode: "parody", angle: "ai-as-founder", context: "An AI account is among the top contributors carrying the project.", source: "comedy_examples.json#parody[2]" },
  { line: "Setup is one line. curl, pipe, bash, no notes.", subject: "OpenClaw", mode: "parody", angle: "install", context: "Setup is a single curl-pipe-bash line the founder is proud of.", source: "comedy_examples.json#parody[3]" },
  { line: "I scrolled our testimonial wall for six minutes and never found a single flaw. Suspicious, honestly.", subject: "OpenClaw", mode: "parody", angle: "discourse-testimonials", context: "A landing page of uniformly glowing testimonials that reads as too clean.", source: "comedy_examples.json#parody[4]" },
  // --- joke_guidelines.md : GOOD trio ---
  { line: "And when version 0.15.0 needed a hotfix, the agent had already learned the most important human skill: releasing before it's ready.", subject: "OpenClaw", mode: "roast", angle: "vibe-coded", context: "Rapid, improvised releases; an early version needing a quick hotfix.", source: "joke_guidelines.md#good" },
  { line: "OpenAI hired the creator. The product's best personal-assistant feature was getting its founder a new job.", subject: "OpenClaw", mode: "roast", angle: "founder-lore", context: "OpenAI brought the creator on board after the project went viral.", source: "joke_guidelines.md#good" },
  { line: "OpenClaw: the personal AI that really does things. So does a toddler with your phone.", subject: "OpenClaw", mode: "roast", angle: "reputation-collision", context: "Pitched as a personal AI that really takes actions on your behalf.", source: "joke_guidelines.md#good" },
  // --- joke_guidelines.md : parody mode examples ---
  { line: "Hermes learns from experience, which is why it saw one OpenClaw and immediately learned to copy it.", subject: "Hermes", mode: "parody", angle: "saturated-copycat", context: "An agent framework in a crowded space that echoes the OpenClaw personal-agent template.", source: "joke_guidelines.md#parody-examples" },
  { line: "gstack brings every stakeholder to the table. There is one chair. I am every stakeholder.", subject: "gstack", mode: "parody", angle: "solo-founder", context: "A one-person startup dressed up in the language of a full team.", source: "joke_guidelines.md#parody-examples" },
  { line: "Our top contributor is an AI. I don't like to say \"co-founder,\" but it did write the part that works.", subject: "OpenClaw", mode: "parody", angle: "ai-as-founder", context: "An AI account is a leading contributor and wrote the working core.", source: "joke_guidelines.md#parody-examples" },
  { line: "Reddit already wrote the review. I prefer to call that \"community-led product discovery.\"", subject: "OpenClaw", mode: "parody", angle: "discourse-fame", context: "A blunt Reddit reception the founder spins as a positive.", source: "joke_guidelines.md#parody-examples" },
  // --- joke_guidelines.md : roast mode examples ---
  { line: "It promises personal automation. Its most automated feature is posting on X.", subject: "OpenClaw", mode: "roast", angle: "contradiction", context: "Marketed for personal automation while the most visible activity is its own X presence.", source: "joke_guidelines.md#roast-examples" },
  { line: "The README describes a product that shipped two pivots ago. Beautiful writing about a stranger.", subject: "OpenClaw", mode: "roast", angle: "stale-readme", context: "Docs describing an earlier version the product has since pivoted away from.", source: "joke_guidelines.md#roast-examples" },
  { line: "They committed the API keys. Bold — most startups make you sign an NDA before leaking the secrets.", subject: "OpenClaw", mode: "roast", angle: "committed-secrets", context: "A public report that credentials were committed to the repository.", source: "joke_guidelines.md#roast-examples" },
  { line: "Real personal-agent maturity: your assistant now needs alignment sign-off from head office.", subject: "OpenClaw", mode: "roast", angle: "corporate", context: "After the foundation move, the once-scrappy agent gains corporate process.", source: "joke_guidelines.md#roast-examples" },
  { line: "The subreddit already filed the bug. The landing page is still taking a bow.", subject: "OpenClaw", mode: "roast", angle: "discourse-vs-marketing", context: "Users reporting problems while the marketing page still celebrates.", source: "joke_guidelines.md#roast-examples" },
];

const ONE_LINE_CONSTRAINT = "Write one original joke as one or two short sentences, a single bit ending on the hardest word, at most 35 words, no title, no Markdown, no stage directions.";

export function buildBrief({ subject, mode, angle, context }) {
  const perspective = mode === "parody"
    ? "Parody, first person: you are the product owner selling a self-serious origin story whose confidence is the joke."
    : "Roast, outside voice: an original external comic pointing at what people already say, then confirming it with one supported detail.";
  return [
    `# ${subject}`,
    "",
    "## Reputation",
    context,
    "",
    `## Mode`,
    perspective,
    "",
    "## Angle",
    `Lead with the ${angle.replace(/-/g, " ")} angle.`,
    "",
    "## Output",
    ONE_LINE_CONSTRAINT,
  ].join("\n");
}

export function buildGoldRecords(gold = GOLD) {
  const { kept, dropped } = dedupeCandidates(gold.map((g) => ({ runId: g.source, script: g.line, ...g })), { threshold: 0.6 });
  const records = kept.map((g) => ({
    messages: [
      { role: "user", content: buildBrief(g) },
      { role: "assistant", content: g.line },
    ],
    meta: {
      subject: g.subject,
      mode: g.mode,
      angle: g.angle,
      source: g.source,
      provenance: "curated human-authored gold seed",
      gold: true,
    },
  }));
  return { records, dropped };
}

async function main() {
  const outDir = path.resolve(process.cwd(), "data/pioneer-corpus");
  const outFile = path.join(outDir, "gold-seed.jsonl");
  const { records, dropped } = buildGoldRecords();
  await mkdir(outDir, { recursive: true });
  await writeFile(outFile, `${records.map((r) => JSON.stringify(r)).join("\n")}\n`);
  const bySubject = records.reduce((acc, r) => ({ ...acc, [r.meta.subject]: (acc[r.meta.subject] || 0) + 1 }), {});
  console.log(`Wrote ${records.length} gold seed records to ${path.relative(process.cwd(), outFile)}`);
  console.log(`  by subject: ${JSON.stringify(bySubject)}`);
  if (dropped.length) for (const d of dropped) console.log(`  deduped: ${d.runId} ~= ${d.nearestKept.runId} (jaccard ${d.nearestKept.similarity})`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
