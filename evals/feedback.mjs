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
  const ordinal = /^packet-(\d+)$/i.exec(requestedId || "");
  return ordinal ? result.packets?.[Number(ordinal[1]) - 1] || null : null;
}

function grouped(records, keyFor) {
  const groups = new Map();
  for (const record of records) {
    const key = keyFor(record);
    groups.set(key, [...(groups.get(key) || []), record]);
  }
  return [...groups.values()];
}

export function compileFeedback(runs) {
  const records = [];
  for (const run of runs) {
    const byRunId = new Map(run.results.map((result) => [result.runId, result]));
    for (const review of run.reviews) {
      const result = byRunId.get(review.run_id);
      const packet = result && resolvePacket(result, review.packet_id);
      if (!result || !packet) continue;
      records.push({
        bundle: run.id,
        runId: result.runId,
        packetId: packet.id,
        provider: result.provider,
        model: result.model,
        profile: result.profile,
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
  const leaderboard = grouped(records, (record) => `${record.provider}__${record.profile}`).map((group) => {
    const ranked = group.filter((record) => record.rank);
    return {
      provider: group[0].provider,
      model: group[0].model,
      profile: group[0].profile,
      reviewed: group.length,
      keeps: group.filter((record) => record.decision === "keep").length,
      revisions: group.filter((record) => record.decision === "revise").length,
      rejects: group.filter((record) => record.decision === "reject").length,
      meanRank: ranked.length ? Number((ranked.reduce((sum, record) => sum + record.rank, 0) / ranked.length).toFixed(2)) : null,
      meanSeconds: Math.round(group.reduce((sum, record) => sum + (record.metrics?.meanSeconds || 0), 0) / group.length),
      gatePassRate: Number((group.reduce((sum, record) => sum + (record.metrics?.passRate || 0), 0) / group.length).toFixed(3)),
    };
  }).sort((left, right) => (left.meanRank ?? Infinity) - (right.meanRank ?? Infinity));
  const pairs = [];
  for (const group of grouped(records.filter((record) => record.rank), (record) => `${record.bundle}__${record.profile}`)) {
    const ordered = [...group].sort((left, right) => left.rank - right.rank);
    for (let winner = 0; winner < ordered.length; winner += 1) {
      for (let loser = winner + 1; loser < ordered.length; loser += 1) {
        pairs.push({
          bundle: ordered[winner].bundle,
          profile: ordered[winner].profile,
          chosen: { runId: ordered[winner].runId, packetId: ordered[winner].packetId, provider: ordered[winner].provider, model: ordered[winner].model },
          rejected: { runId: ordered[loser].runId, packetId: ordered[loser].packetId, provider: ordered[loser].provider, model: ordered[loser].model },
          rationale: ordered[winner].reason,
        });
      }
    }
  }
  return { records, leaderboard, pairs };
}

export { parseCsv };
