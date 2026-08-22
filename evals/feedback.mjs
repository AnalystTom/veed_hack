function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted && character === '"' && text[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { row.push(value); value = ""; }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  row.push(value);
  if (row.some(Boolean)) rows.push(row);
  const [headers = [], ...data] = rows;
  return data.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function resolvePacket(result, requestedId) {
  const exact = result.packets?.find((packet) => packet.id === requestedId);
  if (exact) return exact;
  if (result.script && /^packet-\d+$/i.test(requestedId || "")) {
    return { id: requestedId, title: result.title || "Production script", angle: result.variant || "production" };
  }
  const ordinal = /^packet-(\d+)$/i.exec(requestedId || "");
  return ordinal ? result.packets?.[Number(ordinal[1]) - 1] || null : null;
}

function resolveResult(results, requestedId) {
  const exact = results.find((result) => result.runId === requestedId);
  if (exact) return exact;
  const candidate = /^candidate-([a-z]+)$/i.exec(requestedId || "");
  if (!candidate) return null;
  let index = 0;
  for (const character of candidate[1].toUpperCase()) index = (index * 26) + (character.charCodeAt(0) - 64);
  return results.filter((result) => !result.failed && !result.skipped)[index - 1] || null;
}

function grouped(records, keyFor) {
  const groups = new Map();
  for (const record of records) {
    const key = keyFor(record);
    groups.set(key, [...(groups.get(key) || []), record]);
  }
  return [...groups.values()];
}

function participant(record) {
  return {
    key: `${record.provider}__${record.model}__${record.profile}__${record.variant || ""}`,
    provider: record.provider,
    model: record.model,
    profile: record.profile,
    variant: record.variant || null,
  };
}

function wilsonInterval(successes, total, z = 1.96) {
  if (!total) return null;
  const proportion = successes / total;
  const denominator = 1 + (z ** 2 / total);
  const centre = (proportion + (z ** 2 / (2 * total))) / denominator;
  const margin = (z * Math.sqrt((proportion * (1 - proportion) / total) + (z ** 2 / (4 * total ** 2)))) / denominator;
  return {
    lower: Number((Math.max(0, centre - margin) * 100).toFixed(1)),
    upper: Number((Math.min(1, centre + margin) * 100).toFixed(1)),
  };
}

function pairwiseSummary(records) {
  const stats = new Map(records.map((record) => [participant(record).key, { ...participant(record), wins: 0, losses: 0, ties: 0 }]));
  const comparisons = [];
  for (const group of grouped(records.filter((record) => record.rank), (record) => `${record.bundle}__${record.profile}`)) {
    const ordered = [...group].sort((left, right) => left.rank - right.rank);
    for (let leftIndex = 0; leftIndex < ordered.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < ordered.length; rightIndex += 1) {
        const left = ordered[leftIndex];
        const right = ordered[rightIndex];
        const leftStats = stats.get(participant(left).key);
        const rightStats = stats.get(participant(right).key);
        const outcome = left.rank === right.rank ? "tie" : "left";
        if (outcome === "tie") {
          leftStats.ties += 1;
          rightStats.ties += 1;
        } else {
          leftStats.wins += 1;
          rightStats.losses += 1;
        }
        comparisons.push({
          bundle: left.bundle,
          profile: left.profile,
          left: { runId: left.runId, packetId: left.packetId, provider: left.provider, model: left.model },
          right: { runId: right.runId, packetId: right.packetId, provider: right.provider, model: right.model },
          outcome,
          rationale: outcome === "tie" ? "Equal human rank" : left.reason,
        });
      }
    }
  }
  const standings = [...stats.values()].map((entry) => {
    const comparisonsCount = entry.wins + entry.losses + entry.ties;
    const effectiveWins = entry.wins + (entry.ties * 0.5);
    return {
      ...entry,
      comparisons: comparisonsCount,
      pairwiseScore: comparisonsCount ? Number(((effectiveWins / comparisonsCount) * 100).toFixed(1)) : null,
      interval95: wilsonInterval(effectiveWins, comparisonsCount),
    };
  });
  return { comparisons, standings };
}

export function compileFeedback(runs) {
  const records = [];
  for (const run of runs) {
    for (const review of run.reviews) {
      const result = resolveResult(run.results, review.run_id);
      const packet = result && resolvePacket(result, review.packet_id);
      if (!result || !packet) continue;
      records.push({
        bundle: run.id,
        runId: result.runId,
        packetId: packet.id,
        provider: result.provider,
        model: result.model,
        profile: result.profile,
        variant: result.variant || null,
        decision: review.decision,
        rank: Number(review.rank) || null,
        reason: review.reason,
        notes: review.notes,
        title: packet.title,
        angle: packet.angle,
        metrics: result.metrics,
      });
    }
  }
  const { comparisons, standings } = pairwiseSummary(records);
  const byParticipant = new Map(standings.map((entry) => [entry.key, entry]));
  const leaderboard = grouped(records, (record) => `${record.provider}__${record.model}__${record.profile}__${record.variant || ""}`).map((group) => {
    const ranked = group.filter((record) => record.rank);
    const pairwise = byParticipant.get(participant(group[0]).key);
    return {
      provider: group[0].provider,
      model: group[0].model,
      profile: group[0].profile,
      variant: group[0].variant || null,
      reviewed: group.length,
      keeps: group.filter((record) => record.decision === "keep").length,
      revisions: group.filter((record) => record.decision === "revise").length,
      rejects: group.filter((record) => record.decision === "reject").length,
      meanRank: ranked.length ? Number((ranked.reduce((sum, record) => sum + record.rank, 0) / ranked.length).toFixed(2)) : null,
      meanSeconds: Math.round(group.reduce((sum, record) => sum + (record.metrics?.meanSeconds || 0), 0) / group.length),
      gatePassRate: Number((group.reduce((sum, record) => sum + (record.metrics?.passRate || 0), 0) / group.length).toFixed(3)),
      pairwiseScore: pairwise?.pairwiseScore ?? null,
      pairwiseInterval95: pairwise?.interval95 ?? null,
      pairwiseComparisons: pairwise?.comparisons ?? 0,
    };
  }).sort((left, right) => (right.pairwiseScore ?? -1) - (left.pairwiseScore ?? -1) || (left.meanRank ?? Infinity) - (right.meanRank ?? Infinity));
  const pairs = comparisons.filter((comparison) => comparison.outcome !== "tie").map((comparison) => ({
    bundle: comparison.bundle,
    profile: comparison.profile,
    chosen: comparison.left,
    rejected: comparison.right,
    rationale: comparison.rationale,
  }));
  return { records, leaderboard, pairs, comparisons, standings };
}

export { parseCsv };
