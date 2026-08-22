const MAX_FILES = 24;
const MAX_FILE_CHARS = 12_000;
const SKIPPED_PATH_SEGMENTS = new Set([
  "node_modules",
  "vendor",
  "dist",
  "build",
  "coverage",
  ".git",
  "__pycache__",
]);
const PRIORITY_NAMES = new Set([
  "readme.md",
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "cargo.toml",
  "go.mod",
  "dockerfile",
  "docker-compose.yml",
  "compose.yml",
]);
const SOURCE_EXTENSIONS = new Set([
  "js", "mjs", "cjs", "ts", "tsx", "jsx", "py", "go", "rs", "java", "rb", "php", "cs", "swift",
]);

function apiError(message, response) {
  return new Error(`${message} (${response.status})`);
}

function extension(path) {
  return path.split(".").pop()?.toLowerCase() || "";
}

function skipped(path) {
  return path.split("/").some((part) => SKIPPED_PATH_SEGMENTS.has(part));
}

export function parseGitHubRepositoryUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a public GitHub repository URL.");
  }
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com" || url.username || url.password) {
    throw new Error("Only credential-free HTTPS GitHub repository URLs are supported.");
  }
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 2 || !segments.every((segment) => /^[A-Za-z0-9_.-]+$/.test(segment))) {
    throw new Error("Use a repository URL in the form https://github.com/owner/repository.");
  }
  const [owner, repositoryWithSuffix] = segments;
  const repository = repositoryWithSuffix.replace(/\.git$/i, "");
  if (!repository) throw new Error("A repository name is required.");
  return { owner, repository, canonicalUrl: `https://github.com/${owner}/${repository}` };
}

export function selectRepositoryPaths(tree) {
  const candidates = tree
    .filter((entry) => entry.type === "blob" && !skipped(entry.path) && entry.size <= 250_000)
    .map((entry) => ({ ...entry, name: entry.path.split("/").pop().toLowerCase() }));
  const priority = candidates.filter((entry) => PRIORITY_NAMES.has(entry.name) || entry.path.toLowerCase().startsWith(".github/workflows/"));
  const source = candidates
    .filter((entry) => SOURCE_EXTENSIONS.has(extension(entry.path)))
    .sort((a, b) => a.path.split("/").length - b.path.split("/").length || a.path.localeCompare(b.path));
  const documentation = candidates.filter((entry) => /(^|\/)(docs?|examples?)\//i.test(entry.path) && /\.md$/i.test(entry.path));
  const selected = [];
  for (const entry of [...priority, ...source, ...documentation]) {
    if (!selected.some((item) => item.path === entry.path)) selected.push(entry);
    if (selected.length === MAX_FILES) break;
  }
  return selected;
}

function decodeGitHubContent(content) {
  return Buffer.from(content.replace(/\n/g, ""), "base64").toString("utf8").slice(0, MAX_FILE_CHARS);
}

function makeHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchJson(url, { token, fetchImpl }) {
  const response = await fetchImpl(url, { headers: makeHeaders(token) });
  if (!response.ok) throw apiError("GitHub could not retrieve this repository", response);
  return response.json();
}

async function fetchTextFile({ owner, repository, path, sha, token, fetchImpl }) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const content = await fetchJson(
    `https://api.github.com/repos/${owner}/${repository}/contents/${encodedPath}?ref=${encodeURIComponent(sha)}`,
    { token, fetchImpl },
  );
  if (content.encoding !== "base64" || typeof content.content !== "string") return null;
  return decodeGitHubContent(content.content);
}

function languageBreakdown(tree) {
  const counts = new Map();
  for (const entry of tree) {
    if (entry.type !== "blob" || skipped(entry.path)) continue;
    const ext = extension(entry.path);
    if (SOURCE_EXTENSIONS.has(ext)) counts.set(ext, (counts.get(ext) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
}

function packageDetails(files) {
  const packageFile = files.find((file) => file.path === "package.json");
  if (!packageFile) return null;
  try {
    const manifest = JSON.parse(packageFile.content);
    return {
      name: manifest.name || null,
      scripts: Object.keys(manifest.scripts || {}).slice(0, 12),
      dependencies: Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }).slice(0, 24),
    };
  } catch {
    return null;
  }
}

function importHints(files) {
  const hints = [];
  for (const file of files) {
    if (!SOURCE_EXTENSIONS.has(extension(file.path))) continue;
    const imports = [...file.content.matchAll(/(?:from\s+|require\s*\()["']([^"']+)/g)].map((match) => match[1]);
    if (imports.length) hints.push({ path: file.path, imports: imports.slice(0, 8) });
  }
  return hints.slice(0, 12);
}

export function buildRepositoryEvidence({ repository, tree, files }) {
  const selectedPaths = selectRepositoryPaths(tree).map((entry) => entry.path);
  const languages = languageBreakdown(tree);
  const packageInfo = packageDetails(files);
  const evidence = [
    {
      id: "repo:metadata",
      kind: "repository_metadata",
      sourceUrl: repository.html_url,
      excerpt: `${repository.full_name}: ${repository.description || "No repository description."}`,
      claimableFact: `The repository's default branch is ${repository.default_branch}.`,
      visualCandidate: "repository_card",
    },
    {
      id: "repo:tree",
      kind: "file_tree",
      sourceUrl: `${repository.html_url}/tree/${repository.pinnedSha}`,
      excerpt: selectedPaths.join("\n"),
      claimableFact: `The analysis selected ${selectedPaths.length} representative files from ${tree.length} repository tree entries.`,
      visualCandidate: "file_tree",
    },
  ];
  for (const file of files) {
    evidence.push({
      id: `repo:${file.path}:1-${file.lineCount}`,
      kind: /\.md$/i.test(file.path) ? "documentation" : "source_code",
      sourceUrl: `${repository.html_url}/blob/${repository.pinnedSha}/${file.path}`,
      excerpt: file.content,
      claimableFact: `The repository contains ${file.path}.`,
      visualCandidate: /\.md$/i.test(file.path) ? "documentation_card" : "code_excerpt",
    });
  }
  const languageText = languages.length ? languages.map(({ name, count }) => `${name} (${count})`).join(", ") : "no supported source files";
  const packageText = packageInfo?.dependencies.length ? ` Dependencies include ${packageInfo.dependencies.slice(0, 8).join(", ")}.` : "";
  return {
    summary: `${repository.full_name} is a public repository with ${tree.length} scanned tree entries. Its dominant supported file types are ${languageText}.${packageText}`,
    facts: {
      repository: repository.full_name,
      description: repository.description || null,
      defaultBranch: repository.default_branch,
      pinnedSha: repository.pinnedSha,
      languages,
      package: packageInfo,
      importHints: importHints(files),
      selectedPaths,
    },
    evidence,
  };
}

export async function extractGitHubRepository(url, { token = null, fetchImpl = fetch } = {}) {
  const { owner, repository, canonicalUrl } = parseGitHubRepositoryUrl(url);
  const metadata = await fetchJson(`https://api.github.com/repos/${owner}/${repository}`, { token, fetchImpl });
  if (metadata.private) throw new Error("Private repositories are not supported.");
  const branch = await fetchJson(
    `https://api.github.com/repos/${owner}/${repository}/branches/${encodeURIComponent(metadata.default_branch)}`,
    { token, fetchImpl },
  );
  const pinnedSha = branch.commit.sha;
  const treeResponse = await fetchJson(
    `https://api.github.com/repos/${owner}/${repository}/git/trees/${pinnedSha}?recursive=1`,
    { token, fetchImpl },
  );
  if (treeResponse.truncated) throw new Error("This repository is too large for the MVP extractor. Try a smaller public repository.");
  const selected = selectRepositoryPaths(treeResponse.tree);
  const fetchedFiles = await Promise.all(
    selected.map(async (entry) => {
      const content = await fetchTextFile({ owner, repository, path: entry.path, sha: pinnedSha, token, fetchImpl });
      if (content === null) return null;
      return { path: entry.path, content, lineCount: content.split("\n").length };
    }),
  );
  const repo = { ...metadata, pinnedSha, html_url: canonicalUrl };
  return buildRepositoryEvidence({ repository: repo, tree: treeResponse.tree, files: fetchedFiles.filter(Boolean) });
}
