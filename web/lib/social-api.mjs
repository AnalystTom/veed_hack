import path from "node:path";

import { config } from "dotenv";

const repositoryRoot = path.basename(process.cwd()) === "web"
  ? path.resolve(process.cwd(), "..")
  : process.cwd();
// This module is also imported directly by Next route handlers, so it loads
// the root server-only environment rather than relying on another module's
// import side effect.
config({ path: path.join(repositoryRoot, ".env"), override: false });

function searchTerm(value) {
  return String(value || "")
    .replace(/[^\p{L}\p{N} ._-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function xUrl(id, username) {
  return username ? `https://x.com/${encodeURIComponent(username)}/status/${encodeURIComponent(id)}` : `https://x.com/i/web/status/${encodeURIComponent(id)}`;
}

async function searchX(subjectName, fetchImpl, token) {
  const term = searchTerm(subjectName);
  if (!term || !token?.trim()) return { results: [], warning: "X API is not configured." };
  const params = new URLSearchParams({
    query: `"${term}" -is:retweet`,
    max_results: "10",
    sort_order: "relevancy",
    "tweet.fields": "author_id,created_at,public_metrics,lang",
    expansions: "author_id",
    "user.fields": "username,name",
  });
  const response = await fetchImpl(`https://api.x.com/2/tweets/search/recent?${params}`, {
    headers: { Authorization: `Bearer ${token.trim()}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) return { results: [], warning: `X API search failed (${response.status}).` };
  const payload = await response.json();
  const users = new Map((payload.includes?.users || []).map((user) => [user.id, user]));
  return {
    results: (payload.data || []).map((post) => {
      const user = users.get(post.author_id);
      return {
        title: `X post by ${user?.username || "public account"}`,
        url: xUrl(post.id, user?.username),
        content: cleanText(post.text).slice(0, 900),
        sourceType: "x-api",
        publishedAt: post.created_at || null,
      };
    }).filter((result) => result.content),
    warning: "",
  };
}

async function xBearerToken(fetchImpl, credentials) {
  if (credentials.bearerToken?.trim()) return credentials.bearerToken.trim();
  if (!credentials.consumerKey?.trim() || !credentials.consumerSecret?.trim()) return "";
  const response = await fetchImpl("https://api.x.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${credentials.consumerKey}:${credentials.consumerSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`X token request failed (${response.status}).`);
  const payload = await response.json();
  return String(payload.access_token || "").trim();
}

async function redditToken(fetchImpl, credentials) {
  if (credentials.accessToken?.trim()) return credentials.accessToken.trim();
  if (!credentials.clientId?.trim() || !credentials.clientSecret?.trim()) return "";
  const response = await fetchImpl("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": credentials.userAgent,
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Reddit token request failed (${response.status}).`);
  const payload = await response.json();
  return String(payload.access_token || "").trim();
}

async function searchReddit(subjectName, fetchImpl, credentials) {
  const term = searchTerm(subjectName);
  if (!term || (!credentials.accessToken?.trim() && (!credentials.clientId?.trim() || !credentials.clientSecret?.trim()))) {
    return { results: [], warning: "Reddit API is not configured." };
  }
  let token;
  try { token = await redditToken(fetchImpl, credentials); } catch (error) { return { results: [], warning: error.message }; }
  if (!token) return { results: [], warning: "Reddit API returned no access token." };
  const params = new URLSearchParams({ q: term, sort: "relevance", t: "all", limit: "10", raw_json: "1" });
  const response = await fetchImpl(`https://oauth.reddit.com/search?${params}`, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": credentials.userAgent },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) return { results: [], warning: `Reddit API search failed (${response.status}).` };
  const payload = await response.json();
  return {
    results: (payload.data?.children || []).map(({ data }) => ({
      title: `Reddit: ${cleanText(data?.title).slice(0, 160) || "Public discussion"}`,
      url: data?.permalink ? `https://www.reddit.com${data.permalink}` : "",
      content: cleanText([data?.title, data?.selftext].filter(Boolean).join(" — ")).slice(0, 900),
      sourceType: "reddit-api",
      publishedAt: data?.created_utc ? new Date(Number(data.created_utc) * 1_000).toISOString() : null,
    })).filter((result) => result.url && result.content),
    warning: "",
  };
}

export async function searchOfficialSocialContext(summary, fetchImpl = fetch, env = process.env) {
  const credentials = {
    accessToken: env.REDDIT_ACCESS_TOKEN,
    clientId: env.REDDIT_CLIENT_ID,
    clientSecret: env.REDDIT_CLIENT_SECRET,
    userAgent: env.REDDIT_USER_AGENT?.trim() || "Roastr/0.1 (public-discourse research)",
  };
  const xCredentials = {
    bearerToken: env.X_BEARER_TOKEN,
    consumerKey: env.X_CONSUMER_KEY,
    consumerSecret: env.X_CONSUMER_SECRET,
  };
  const xSearch = (async () => {
    try { return await searchX(summary?.name, fetchImpl, await xBearerToken(fetchImpl, xCredentials)); }
    catch (error) { return { results: [], warning: error.message }; }
  })();
  const [x, reddit] = await Promise.all([
    xSearch,
    searchReddit(summary?.name, fetchImpl, credentials),
  ]);
  const results = [...x.results, ...reddit.results];
  return {
    answer: "",
    results,
    mode: results.length ? "official-x-reddit-api" : "direct-public-data",
    warning: [x.warning, reddit.warning].filter(Boolean).join(" "),
  };
}
