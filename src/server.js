import { createServer as createHttpServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getOptionalConfig, providerStatus } from "./config.js";
import { extractGitHubRepository } from "./github.js";
import { generateRoastPackets } from "./openai.js";
import { generateGrokRoastPackets } from "./openrouter.js";
import { ProjectStore } from "./project-store.js";
import { evaluateRoastPacket } from "./roastbench.js";
import { researchPublicPerception } from "./tavily.js";

const publicDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendError(response, error) {
  const status = error.message.includes("not found") ? 404 : 400;
  sendJson(response, status, { error: error.message || "Unexpected server error." });
}

async function readJson(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 1_000_000) throw new Error("Request body is too large.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

function projectResponse(project) {
  return {
    ...project,
    evidenceCount: project.researchPack.evidence.length,
    packetCount: project.packets.length,
  };
}

async function serveStatic(pathname, response) {
  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  if (!/^[a-zA-Z0-9._/-]+$/.test(requested)) return false;
  const filePath = path.resolve(publicDirectory, requested);
  if (!filePath.startsWith(`${publicDirectory}${path.sep}`)) return false;
  try {
    const content = await readFile(filePath);
    const type = filePath.endsWith(".css") ? "text/css" : filePath.endsWith(".js") ? "application/javascript" : "text/html";
    response.writeHead(200, { "Content-Type": `${type}; charset=utf-8` });
    response.end(content);
    return true;
  } catch {
    return false;
  }
}

export function createApp({ store = new ProjectStore(), config = getOptionalConfig(), fetchImpl = fetch } = {}) {
  return createHttpServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    try {
      if (request.method === "GET" && url.pathname === "/api/health") {
        return sendJson(response, 200, { ok: true, providers: providerStatus() });
      }
      if (request.method === "GET" && url.pathname === "/api/projects") {
        return sendJson(response, 200, { projects: store.list().map(projectResponse) });
      }
      if (request.method === "POST" && url.pathname === "/api/projects") {
        const body = await readJson(request);
        const repositoryPack = await extractGitHubRepository(body.url, { token: config.githubToken, fetchImpl });
        const perceptionPack = await researchPublicPerception({
          repositoryName: repositoryPack.facts.repository,
          repositoryUrl: body.url,
          apiKey: config.tavilyApiKey,
          fetchImpl,
        });
        const project = store.create({
          url: body.url,
          treatment: body.treatment || "Funny / Roast",
          instructions: typeof body.instructions === "string" ? body.instructions.slice(0, 2_000) : "",
          repositoryPack,
          researchPack: {
            mode: perceptionPack.mode,
            message: perceptionPack.message,
            evidence: [...repositoryPack.evidence, ...perceptionPack.evidence],
            perception: perceptionPack.perception,
          },
        });
        return sendJson(response, 201, { project: projectResponse(project) });
      }
      const projectMatch = url.pathname.match(/^\/api\/projects\/([a-f0-9-]+)$/i);
      if (request.method === "GET" && projectMatch) {
        const project = store.get(projectMatch[1]);
        if (!project) throw new Error("Project not found.");
        return sendJson(response, 200, { project: projectResponse(project) });
      }
      const packetsMatch = url.pathname.match(/^\/api\/projects\/([a-f0-9-]+)\/packets$/i);
      if (request.method === "POST" && packetsMatch) {
        const project = store.get(packetsMatch[1]);
        if (!project) throw new Error("Project not found.");
        const body = await readJson(request);
        const generationOptions = {
          count: Math.min(Math.max(Number(body.count) || 12, 1), 20),
          fetchImpl,
        };
        const generated = body.writer === "grok"
          ? await generateGrokRoastPackets(project, { ...generationOptions, apiKey: config.openrouterApiKey })
          : await generateRoastPackets(project, { ...generationOptions, apiKey: config.openaiApiKey });
        const packets = generated.packets.map((packet) => ({
          ...packet,
          evaluation: evaluateRoastPacket(packet, project.researchPack.evidence),
        }));
        const updated = store.update(project.id, { packets, packetMode: generated.mode });
        return sendJson(response, 201, { project: projectResponse(updated) });
      }
      const feedbackMatch = url.pathname.match(/^\/api\/projects\/([a-f0-9-]+)\/feedback$/i);
      if (request.method === "POST" && feedbackMatch) {
        const project = store.get(feedbackMatch[1]);
        if (!project) throw new Error("Project not found.");
        const body = await readJson(request);
        if (!project.packets.some((packet) => packet.id === body.packetId)) throw new Error("Packet not found.");
        if (!["keep", "reject", "revise"].includes(body.action)) throw new Error("Feedback action must be keep, reject, or revise.");
        const feedback = [...project.feedback, {
          packetId: body.packetId,
          action: body.action,
          note: typeof body.note === "string" ? body.note.slice(0, 1_000) : "",
          createdAt: new Date().toISOString(),
        }];
        const updated = store.update(project.id, { feedback });
        return sendJson(response, 201, { project: projectResponse(updated) });
      }
      if (request.method === "GET" && await serveStatic(url.pathname, response)) return;
      sendJson(response, 404, { error: "Not found." });
    } catch (error) {
      sendError(response, error);
    }
  });
}

export function startServer(port = Number(process.env.PORT || 3000)) {
  const server = createApp();
  server.listen(port, () => console.log(`RoastBench is running at http://localhost:${port}`));
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) startServer();
