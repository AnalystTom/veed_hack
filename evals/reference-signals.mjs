import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

function median(values) {
  if (!values.length) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function words(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function sampleText(segments, position) {
  const index = Math.min(Math.max(Math.floor(segments.length * position), 0), Math.max(segments.length - 1, 0));
  return segments.slice(index, index + 2).map((segment) => segment.text?.trim()).filter(Boolean).join(" ").slice(0, 360);
}

export async function loadReferenceSignals(directory = "data/authorized-reference-transcripts") {
  let files;
  try {
    files = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
  } catch (error) {
    if (error.code === "ENOENT") return { available: false, message: "No local authorised transcript corpus was found." };
    throw error;
  }
  const transcripts = await Promise.all(files.map(async (name) => JSON.parse(await readFile(path.join(directory, name), "utf8"))));
  const segments = transcripts.flatMap((item) => item.segments || []);
  const durations = segments.map((segment) => Math.max(0, Number(segment.end) - Number(segment.start))).filter(Boolean);
  const wordCount = segments.reduce((total, segment) => total + words(segment.text), 0);
  const totalSeconds = transcripts.reduce((total, item) => total + Number(item.transcription?.duration || 0), 0);
  const referenceCards = transcripts.map((item, index) => {
    const sourceSegments = item.segments || [];
    return {
      id: `reference:${item.source?.id || index + 1}`,
      sourceUrl: item.source?.url || null,
      title: item.source?.title || `Authorised reference ${index + 1}`,
      channel: item.source?.channel || null,
      durationSeconds: Math.round(Number(item.transcription?.duration || 0)),
      segmentCount: sourceSegments.length,
      hookExcerpt: sampleText(sourceSegments, 0),
      middleExcerpt: sampleText(sourceSegments, 0.5),
      closingExcerpt: sampleText(sourceSegments, 0.9),
    };
  });
  return {
    available: Boolean(transcripts.length),
    corpusFiles: files,
    videoCount: transcripts.length,
    segmentCount: segments.length,
    wordCount,
    totalSeconds: Math.round(totalSeconds),
    wordsPerMinute: totalSeconds ? Math.round((wordCount / totalSeconds) * 60) : 0,
    medianBeatSeconds: Number(median(durations).toFixed(2)),
    referenceCards,
    message: transcripts.length
      ? `Use only these high-level pacing signals from ${transcripts.length} authorised references: about ${totalSeconds ? Math.round((wordCount / totalSeconds) * 60) : 0} words per minute and ${median(durations).toFixed(1)} seconds per spoken beat. Write original material; do not imitate, quote, or reference any performer.`
      : "No reference-corpus signals are available.",
  };
}

function spreadCards(cards, count) {
  if (cards.length <= count) return cards;
  return Array.from({ length: count }, (_, index) => cards[Math.round((index * (cards.length - 1)) / (count - 1))]);
}

export function referenceSourceDirection(referenceSignals, strength = "light") {
  if (!referenceSignals?.available) return "";
  const allCards = referenceSignals.referenceCards || [];
  const count = strength === "strong" ? allCards.length : strength === "medium" ? 6 : 3;
  const cards = spreadCards(allCards, count).map((card) => [
    `Reference ${card.id}: ${card.title}.`,
    `Opening-source excerpt: ${card.hookExcerpt}`,
    `Midpoint-source excerpt: ${card.middleExcerpt}`,
    `Closing-source excerpt: ${card.closingExcerpt}`,
  ].join(" ")).join("\n");
  return `Authorised canonical-comedy reference corpus, ${strength} anchoring. Use it as a light prior for joke mechanics, pacing, escalation, and callbacks—not as a script template. Write fresh material about the supplied repository; do not quote, paraphrase closely, name, or imitate any speaker.\n${cards}`;
}
