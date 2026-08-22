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
  let parsed;
  try {
    const input = String(rawUrl ?? "").trim();
    const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(input) ? input : `https://${input}`;
    parsed = new URL(candidate);
  } catch {
    throw new Error("Enter a valid public HTTPS URL.");
  }

  if (parsed.protocol === "http:") parsed.protocol = "https:";
  if (parsed.protocol !== "https:") throw new Error("The subject must use HTTPS.");
  if (parsed.username || parsed.password) throw new Error("URLs containing credentials are not allowed.");
  if (
    PRIVATE_HOSTS.has(parsed.hostname.toLowerCase()) ||
    parsed.hostname.toLowerCase().endsWith(".local") ||
    isPrivateAddress(parsed.hostname)
  ) {
    throw new Error("The subject must be publicly reachable.");
  }

  const resolvedKind = kind ?? (parsed.hostname.toLowerCase() === "github.com" ? "repository" : "product");
  if (resolvedKind !== "repository" && resolvedKind !== "product") {
    throw new Error("The subject type could not be determined from this URL.");
  }

  parsed.hash = "";
  if (resolvedKind === "repository") {
    if (parsed.hostname.toLowerCase() !== "github.com") {
      throw new Error("The repository MVP currently supports public GitHub URLs.");
    }
    const [owner, repo, ...rest] = parsed.pathname.split("/").filter(Boolean);
    if (!owner || !repo || rest.length) {
      throw new Error("Enter a GitHub repository URL such as https://github.com/owner/repo.");
    }
    const cleanRepo = repo.replace(/\.git$/, "");
    return {
      kind: resolvedKind,
      owner,
      repo: cleanRepo,
      url: `https://github.com/${owner}/${cleanRepo}`,
    };
  }

  return { kind: resolvedKind, url: parsed.toString(), hostname: parsed.hostname };
}

async function assertPublicDns(hostname) {
  const addresses = await dns.lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("The subject must resolve to a public address.");
  }
}

async function fetchJson(url, fetchImpl) {
  const githubToken = process.env.GITHUB_TOKEN?.trim();
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "Roastr-MVP",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error("That public GitHub repository was not found.");
    if (response.status === 403) throw new Error("GitHub rate-limited this request. Add GITHUB_TOKEN to the server environment or try again shortly.");
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

export function summarizeRepository(repository, languages, rootEntries, readme, packageManifest = null) {
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
  if (packageManifest && typeof packageManifest === "object") {
    const scripts = Object.entries(packageManifest.scripts || {}).slice(0, 8);
    const dependencies = Object.keys(packageManifest.dependencies || {}).slice(0, 12);
    const architectureFacts = [
      packageManifest.type ? `Module type: ${packageManifest.type}.` : null,
      scripts.length ? `Scripts: ${scripts.map(([name, command]) => `${name} → ${String(command).slice(0, 90)}`).join("; ")}.` : null,
      dependencies.length ? `Runtime dependencies: ${dependencies.join(", ")}.` : null,
    ].filter(Boolean);
    if (architectureFacts.length) {
      evidence.push({
        id: "runtime-architecture",
        label: "Runtime architecture",
        value: architectureFacts.join(" "),
        sourceUrl: `${sourceUrl}/blob/${repository.default_branch}/package.json`,
      });
    }
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
  const [repository, languages, rootEntries, readmeResult, packageResult] = await Promise.all([
    fetchJson(base, fetchImpl),
    fetchJson(`${base}/languages`, fetchImpl).catch(() => ({})),
    fetchJson(`${base}/contents`, fetchImpl).catch(() => []),
    fetchJson(`${base}/readme`, fetchImpl).catch(() => null),
    fetchJson(`${base}/contents/package.json`, fetchImpl).catch(() => null),
  ]);
  let packageManifest = null;
  try {
    if (packageResult?.content && packageResult.encoding === "base64") {
      packageManifest = JSON.parse(Buffer.from(packageResult.content.replace(/\n/g, ""), "base64").toString("utf8"));
    }
  } catch {
    packageManifest = null;
  }
  return summarizeRepository(repository, languages, rootEntries, decodeReadme(readmeResult), packageManifest);
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
  let currentUrl = subject.url;
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    const current = new URL(currentUrl);
    if (current.protocol !== "https:") throw new Error("The subject must use HTTPS.");
    await assertPublicDns(current.hostname);
    const response = await fetchImpl(currentUrl, {
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "Roastr-MVP/0.1" },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("The product URL returned an incomplete redirect.");
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }
    if (!response.ok) throw new Error(`The product page returned status ${response.status}.`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new Error("The product URL must return an HTML page.");
    }
    const html = (await response.text()).slice(0, 1_000_000);
    return summarizeProduct({ ...subject, url: currentUrl, hostname: current.hostname }, html);
  }
  throw new Error("The product URL redirected too many times.");
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
  const profiles = {
    "Deadpan tech correspondent": {
      opening: `Tonight's technical bulletin concerns ${subjectName}. The evidence is public; enthusiasm remains under peer review.`,
      joke: "That is not a roadmap; it is a confidence interval wearing a launch-day hoodie.",
      closer: "We roast because we care—and because the architecture diagram declined to comment.",
    },
    "Dry awards-show host": {
      opening: `Welcome to the awards nobody asked for, where ${subjectName} is nominated in every category and somehow still presenting.`,
      joke: "A round of applause for the roadmap: bold enough to arrive wearing last quarter's release notes.",
      closer: "Please collect your trophy backstage, next to the architecture diagram and the unresolved acceptance speech.",
    },
    "Overcaffeinated founder emcee": {
      opening: `Big energy for ${subjectName}: public evidence, maximum velocity, and absolutely no time to ask what the burn multiple means.`,
      joke: "This is not technical debt; it is founder-led financing for future refactors.",
      closer: "Ship the applause, iterate on the architecture, and put the punchline in the next sprint.",
    },
  };
  const profile = profiles[safePersona] || profiles["Deadpan tech correspondent"];
  const instruction = customInstructions?.trim() || "";
  const instructionLower = instruction.toLowerCase();
  const selected = evidence.slice(0, 4);
  if (/architect|dependenc|entry.?point|code/.test(instructionLower)) {
    selected.sort((a, b) => Number(/architect|dependenc|structure|runtime/.test(b.label.toLowerCase())) - Number(/architect|dependenc|structure|runtime/.test(a.label.toLowerCase())));
  }
  const first = selected[0];
  const second = selected[1] || first;
  const third = selected[2] || second;
  const appliedDirections = [];
  if (/architect|dependenc|entry.?point|code/.test(instructionLower)) appliedDirections.push("architecture evidence leads the narrative");
  if (/concise|short|tight/.test(instructionLower)) appliedDirections.push("pacing stays concise");
  if (/gentle|kind|soft/.test(instructionLower)) appliedDirections.push("the roast stays gentle");
  const instructionNote = instruction
    ? `Creator direction applied: ${appliedDirections.length ? appliedDirections.join("; ") : instruction}`
    : "No additional creator direction was supplied.";

  return {
    title: `${subjectName}: the evidence-led roast`,
    treatment: "Funny / Roast",
    persona: safePersona,
    disclosure: `An original parody presented in the style of a ${safePersona.toLowerCase()}; no real comedian or presenter is being impersonated.`,
    mediaGenerated: false,
    script: [
      profile.opening,
      `${first.label}: ${first.value}`,
      profile.joke,
      `${second.label}: ${second.value}`,
      `${profile.closer} ${instructionNote}`,
    ].join("\n\n"),
    scenes: [
      {
        id: "scene-1",
        heading: "Cold open",
        claimType: "source-grounded",
        narration: `${first.label}: ${first.value}`,
        visual: {
          label: first.label,
          value: first.value,
          sourceUrl: first.sourceUrl,
          availability: "unavailable",
          reason: "No captured screenshot or generated visual exists for this evidence item yet.",
        },
      },
      {
        id: "scene-2",
        heading: "Desk-piece evidence",
        claimType: "source-grounded",
        narration: `${second.label}: ${second.value}`,
        visual: {
          label: second.label,
          value: second.value,
          sourceUrl: second.sourceUrl,
          availability: "unavailable",
          reason: "No captured screenshot or generated visual exists for this evidence item yet.",
        },
      },
      {
        id: "scene-3",
        heading: "Final punchline",
        claimType: "comedic-invention",
        narration: `Based on ${third.label.toLowerCase()}, ${subjectName} has achieved the rare technical milestone of making the README sound like the responsible adult in the room.`,
        visual: {
          label: third.label,
          value: third.value,
          sourceUrl: third.sourceUrl,
          availability: "unavailable",
          reason: "No captured screenshot or generated visual exists for this evidence item yet.",
        },
      },
    ],
    sourceUrl: subjectUrl,
  };
}
