const MAX_SOURCES = 5;
const MAX_EXCERPT_CHARS = 3_500;

async function tavilyRequest(path, apiKey, body, fetchImpl) {
  const response = await fetchImpl(`https://api.tavily.com${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Tavily research failed (${response.status}).`);
  return response.json();
}

function stanceFor(text) {
  const value = text.toLowerCase();
  if (/(drama|controvers|beef|backlash|roast|meme)/.test(value)) return "joke_or_drama";
  if (/(bug|broken|slow|hate|frustrat|critic|pain)/.test(value)) return "criticism";
  if (/(love|great|fast|excellent|praise|impressive)/.test(value)) return "praise";
  return "neutral_observation";
}

export async function researchPublicPerception({ repositoryName, repositoryUrl, apiKey, fetchImpl = fetch }) {
  if (!apiKey) {
    return {
      mode: "unavailable",
      message: "Add TAVILY_API_KEY to enable public perception research.",
      evidence: [],
      perception: [],
    };
  }
  const query = `${repositoryName} GitHub opinions criticism praise drama memes developer discussion`;
  const search = await tavilyRequest("/search", apiKey, {
    query,
    search_depth: "advanced",
    max_results: 8,
    include_raw_content: false,
  }, fetchImpl);
  const ranked = (search.results || []).filter((result) => result.url !== repositoryUrl).slice(0, MAX_SOURCES);
  const extract = ranked.length
    ? await tavilyRequest("/extract", apiKey, { urls: ranked.map((result) => result.url), extract_depth: "advanced" }, fetchImpl)
    : { results: [] };
  const extractedByUrl = new Map((extract.results || []).map((result) => [result.url, result.raw_content || ""]));
  const evidence = ranked.map((result, index) => {
    const excerpt = (extractedByUrl.get(result.url) || result.content || "").slice(0, MAX_EXCERPT_CHARS);
    return {
      id: `web:${index + 1}`,
      kind: "public_discussion",
      sourceUrl: result.url,
      title: result.title || result.url,
      excerpt,
      retrievedAt: new Date().toISOString(),
      claimableFact: `A public source discusses ${repositoryName}.`,
      visualCandidate: "public_reaction_card",
    };
  });
  const perception = evidence.map((source) => ({
    sourceEvidenceId: source.id,
    stance: stanceFor(`${source.title} ${source.excerpt}`),
    roastableTension: source.title,
    recurrence: "single_source",
    status: "needs_review",
  }));
  return { mode: "live", message: null, evidence, perception };
}
