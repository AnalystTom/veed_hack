import dns from "node:dns/promises";
import net from "node:net";

const PRIVATE_HOSTS = new Set(["localhost", "localhost.localdomain"]);

function isPrivateAddress(address) {
  if (!net.isIP(address)) return false;
  if (address === "::1" || address === "::" || address.startsWith("fe80:")) return true;
  if (address.startsWith("fc") || address.startsWith("fd")) return true;
  const parts = address.split(".").map(Number);
  if (parts.length !== 4) return false;
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

export function normalizeSubjectUrl(kind, rawUrl) {
  if (kind !== "repository" && kind !== "product") {
    throw new Error("Choose Repository or Product.");
  }

  let parsed;
  try {
    parsed = new URL(String(rawUrl ?? "").trim());
  } catch {
    throw new Error("Enter a valid public HTTPS URL.");
  }

  if (parsed.protocol !== "https:") throw new Error("The subject must use HTTPS.");
  if (parsed.username || parsed.password) throw new Error("URLs containing credentials are not allowed.");
  if (
    PRIVATE_HOSTS.has(parsed.hostname.toLowerCase()) ||
    parsed.hostname.toLowerCase().endsWith(".local") ||
    isPrivateAddress(parsed.hostname)
  ) {
    throw new Error("The subject must be publicly reachable.");
  }

  parsed.hash = "";
  if (kind === "repository") {
    if (parsed.hostname.toLowerCase() !== "github.com") {
      throw new Error("The repository MVP currently supports public GitHub URLs.");
    }
    const [owner, repo, ...rest] = parsed.pathname.split("/").filter(Boolean);
    if (!owner || !repo || rest.length) {
      throw new Error("Enter a GitHub repository URL such as https://github.com/owner/repo.");
    }
    const cleanRepo = repo.replace(/\.git$/, "");
    return {
      kind,
      owner,
      repo: cleanRepo,
      url: `https://github.com/${owner}/${cleanRepo}`,
    };
  }

  return { kind, url: parsed.toString(), hostname: parsed.hostname };
}

async function assertPublicDns(hostname) {
  const addresses = await dns.lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("The subject must resolve to a public address.");
  }
}

async function fetchJson(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "Roastr-MVP",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error("That public GitHub repository was not found.");
    if (response.status === 403) throw new Error("GitHub rate-limited this request. Try again shortly.");
    throw new Error(`GitHub research failed with status ${response.status}.`);
  }
  return response.json();
}

function decodeReadme(payload) {
  if (!payload?.content || payload.encoding !== "base64") return "";
  return Buffer.from(payload.content.replace(/\n/g, ""), "base64")
    .toString("utf8")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#>*_`\[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 420);
}

export function summarizeRepository(repository, languages, rootEntries, readme) {
  const sourceUrl = repository.html_url;
  const directories = rootEntries.filter((item) => item.type === "dir").map((item) => item.name).slice(0, 12);
  const files = rootEntries.filter((item) => item.type === "file").map((item) => item.name).slice(0, 12);
  const totalBytes = Object.values(languages).reduce((sum, value) => sum + Number(value), 0);
  const languageNames = Object.entries(languages)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 5)
    .map(([name, bytes]) => `${name} ${totalBytes ? Math.round((Number(bytes) / totalBytes) * 100) : 0}%`);
  const description = repository.description?.trim() || "No repository description is available.";
  const architectureValue = [
    directories.length ? `Directories: ${directories.join(", ")}.` : "No root directories were returned.",
    files.length ? `Root files: ${files.join(", ")}.` : "No root files were returned.",
  ].join(" ");
  const evidence = [
    { id: "description", label: "Repository description", value: description, sourceUrl },
    {
      id: "activity",
      label: "Public repository facts",
      value: `${repository.stargazers_count} stars, ${repository.forks_count} forks, default branch ${repository.default_branch}, license ${repository.license?.spdx_id || "not declared"}.`,
      sourceUrl,
    },
    { id: "architecture", label: "Repository structure", value: architectureValue, sourceUrl },
  ];
  if (languageNames.length) {
    evidence.push({ id: "languages", label: "Language mix", value: languageNames.join(", "), sourceUrl });
  }
  if (readme) {
    evidence.push({ id: "readme", label: "README excerpt", value: readme, sourceUrl });
  }

  return {
    kind: "repository",
    name: repository.full_name,
    url: sourceUrl,
    overview: `${repository.full_name}: ${description}`,
    architecture: { directories, files, languages: languageNames },
    evidence,
    researchedAt: new Date().toISOString(),
  };
}

async function researchRepository(subject, fetchImpl) {
  const base = `https://api.github.com/repos/${encodeURIComponent(subject.owner)}/${encodeURIComponent(subject.repo)}`;
  const [repository, languages, rootEntries, readmeResult] = await Promise.all([
    fetchJson(base, fetchImpl),
    fetchJson(`${base}/languages`, fetchImpl).catch(() => ({})),
    fetchJson(`${base}/contents`, fetchImpl).catch(() => []),
    fetchJson(`${base}/readme`, fetchImpl).catch(() => null),
  ]);
  return summarizeRepository(repository, languages, rootEntries, decodeReadme(readmeResult));
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function firstMatch(html, expression) {
  return decodeEntities(html.match(expression)?.[1]?.replace(/\s+/g, " ").trim() || "");
}

export function summarizeProduct(subject, html) {
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || subject.hostname;
  const description =
    firstMatch(html, /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']*)["'][^>]*>/i) ||
    firstMatch(html, /<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*>/i);
  const headings = [...html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)]
    .map((match) => decodeEntities(match[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()))
    .filter(Boolean)
    .slice(0, 8);
  const evidence = [{ id: "title", label: "Page title", value: title, sourceUrl: subject.url }];
  if (description) evidence.push({ id: "description", label: "Meta description", value: description, sourceUrl: subject.url });
  if (headings.length) evidence.push({ id: "headings", label: "Visible page headings", value: headings.join(" · "), sourceUrl: subject.url });
  return {
    kind: "product",
    name: title,
    url: subject.url,
    overview: description || `The public page identifies itself as “${title}”.`,
    architecture: null,
    evidence,
    researchedAt: new Date().toISOString(),
  };
}

async function researchProduct(subject, fetchImpl) {
  await assertPublicDns(subject.hostname);
  const response = await fetchImpl(subject.url, {
    headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "Roastr-MVP/0.1" },
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`The product page returned status ${response.status}.`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new Error("The product URL must return an HTML page.");
  }
  const html = (await response.text()).slice(0, 1_000_000);
  return summarizeProduct(subject, html);
}

export async function researchSubject(kind, rawUrl, fetchImpl = fetch) {
  const subject = normalizeSubjectUrl(kind, rawUrl);
  return subject.kind === "repository"
    ? researchRepository(subject, fetchImpl)
    : researchProduct(subject, fetchImpl);
}

export function buildRoastPlan({ subjectName, subjectUrl, persona, customInstructions, evidence }) {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    throw new Error("Keep at least one research item before generating the script.");
  }
  const safePersona = persona?.trim() || "Deadpan tech correspondent";
  const selected = evidence.slice(0, 4);
  const first = selected[0];
  const second = selected[1] || first;
  const third = selected[2] || second;
  const instructionNote = customInstructions?.trim()
    ? ` Creator direction: ${customInstructions.trim()}`
    : "";

  return {
    title: `${subjectName}: the evidence-led roast`,
    treatment: "Funny / Roast",
    persona: safePersona,
    disclosure: `An original parody presented in the style of a ${safePersona.toLowerCase()}; no real comedian or presenter is being impersonated.`,
    mediaGenerated: false,
    script: [
      `Tonight's subject is ${subjectName}. The evidence is public, and the jokes are clearly labeled.`,
      `${first.label}: ${first.value}`,
      `That is not a roadmap; it is a confidence interval wearing a launch-day hoodie.`,
      `${second.label}: ${second.value}`,
      `We roast because we care—and because the architecture diagram filed a restraining order.${instructionNote}`,
    ].join("\n\n"),
    scenes: [
      {
        id: "scene-1",
        heading: "Cold open",
        claimType: "source-grounded",
        narration: `${first.label}: ${first.value}`,
        visual: { label: first.label, value: first.value, sourceUrl: first.sourceUrl },
      },
      {
        id: "scene-2",
        heading: "Desk-piece evidence",
        claimType: "source-grounded",
        narration: `${second.label}: ${second.value}`,
        visual: { label: second.label, value: second.value, sourceUrl: second.sourceUrl },
      },
      {
        id: "scene-3",
        heading: "Final punchline",
        claimType: "comedic-invention",
        narration: `Based on ${third.label.toLowerCase()}, ${subjectName} has achieved the rare technical milestone of making the README sound like the responsible adult in the room.`,
        visual: { label: third.label, value: third.value, sourceUrl: third.sourceUrl },
      },
    ],
    sourceUrl: subjectUrl,
  };
}
