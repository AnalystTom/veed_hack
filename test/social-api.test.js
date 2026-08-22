import assert from "node:assert/strict";
import test from "node:test";

import { searchOfficialSocialContext } from "../web/lib/social-api.mjs";

test("official social research uses configured X and Reddit APIs and returns canonical sources", async () => {
  const requests = [];
  const response = await searchOfficialSocialContext({ name: "OpenClaw" }, async (url, options = {}) => {
    requests.push({ url, options });
    if (url.startsWith("https://api.x.com/")) return { ok: true, json: async () => ({ data: [{ id: "123", text: "OpenClaw post", author_id: "u1", created_at: "2026-08-22T00:00:00Z" }], includes: { users: [{ id: "u1", username: "openclaw" }] } }) };
    if (url.startsWith("https://www.reddit.com/api/v1/access_token")) return { ok: true, json: async () => ({ access_token: "reddit-token" }) };
    return { ok: true, json: async () => ({ data: { children: [{ data: { title: "OpenClaw issue", selftext: "Setup is hard", permalink: "/r/openclaw/comments/abc", created_utc: 1_700_000_000 } }] } }) };
  }, {
    X_BEARER_TOKEN: "x-token",
    REDDIT_CLIENT_ID: "client-id",
    REDDIT_CLIENT_SECRET: "client-secret",
    REDDIT_USER_AGENT: "Roastr test",
  });
  assert.equal(response.results.length, 2);
  assert.equal(response.results[0].url, "https://x.com/openclaw/status/123");
  assert.equal(response.results[1].url, "https://www.reddit.com/r/openclaw/comments/abc");
  assert.match(requests[0].url, /tweets\/search\/recent/);
  assert.equal(requests.some(({ url }) => url.startsWith("https://oauth.reddit.com/search")), true);
});
