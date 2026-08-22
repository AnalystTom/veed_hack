const form = document.querySelector("#project-form");
const message = document.querySelector("#message");
const projectRoot = document.querySelector("#project");
const template = document.querySelector("#project-template");
let currentProject = null;

const escape = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));

function setMessage(value, success = false) {
  message.textContent = value;
  message.classList.toggle("ok", success);
}

async function request(path, options = {}) {
  const response = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function renderProject(project) {
  currentProject = project;
  projectRoot.hidden = false;
  projectRoot.replaceChildren(template.content.cloneNode(true));
  projectRoot.querySelector(".project-name").textContent = project.repositoryPack.facts.repository;
  projectRoot.querySelector(".project-summary").textContent = project.repositoryPack.summary;
  const link = projectRoot.querySelector(".repo-link");
  link.href = project.url;
  projectRoot.querySelector(".evidence-count").textContent = `${project.evidenceCount} source records`;
  projectRoot.querySelector(".research-mode").textContent = project.researchPack.mode === "live" ? "Tavily research" : "research unavailable";
  const facts = projectRoot.querySelector(".facts");
  const factValues = [
    `Pinned ${project.repositoryPack.facts.pinnedSha.slice(0, 8)}`,
    ...project.repositoryPack.facts.languages.map((language) => `${language.name} × ${language.count}`),
    ...(project.repositoryPack.facts.package?.dependencies?.slice(0, 4) || []),
  ];
  facts.innerHTML = factValues.map((fact) => `<span class="fact">${escape(fact)}</span>`).join("");
  const evidenceList = projectRoot.querySelector(".evidence-list");
  evidenceList.innerHTML = project.researchPack.evidence.map((item) => `
    <article class="evidence-record"><span class="tag">${escape(item.kind)}</span><br><a href="${escape(item.sourceUrl)}" target="_blank" rel="noreferrer">${escape(item.id)} ↗</a><p>${escape(item.claimableFact)}</p></article>`).join("");
  const perceptionMessage = projectRoot.querySelector(".perception-message");
  perceptionMessage.textContent = project.researchPack.message || "Review these public signals before they influence a script. Public opinion is framed as perception, never fact.";
  const perceptionList = projectRoot.querySelector(".perception-list");
  perceptionList.innerHTML = project.researchPack.perception.length
    ? project.researchPack.perception.map((item) => `<article class="perception-record"><span class="tag">${escape(item.stance)}</span><p>${escape(item.roastableTension)}</p><p>Evidence: ${escape(item.sourceEvidenceId)} · ${escape(item.recurrence)}</p></article>`).join("")
    : "";
  const generateButton = projectRoot.querySelector(".generate-button");
  generateButton.addEventListener("click", () => generatePackets(generateButton));
  renderPackets();
}

function renderPackets() {
  if (!currentProject) return;
  const mode = projectRoot.querySelector(".packet-mode");
  const writer = currentProject.packetMode === "grok" ? "Grok 4.6 challenger" : currentProject.packetMode === "live" ? "GPT-5.6 Luna" : "Local fallback";
  mode.textContent = currentProject.packets.length
    ? `${writer} generated ${currentProject.packetCount} candidates. Your keep/reject/revise feedback is retained on this project.`
    : "Generate a cheap candidate batch before using narration or video providers.";
  const list = projectRoot.querySelector(".packets-list");
  const feedbackByPacket = new Map(currentProject.feedback.map((item) => [item.packetId, item]));
  list.innerHTML = currentProject.packets.map((packet) => {
    const feedback = feedbackByPacket.get(packet.id);
    const errors = packet.evaluation.issues.map((issue) => escape(issue.message)).join(" · ");
    return `<article class="packet">
      <div class="packet-head"><div><h4>${escape(packet.title)}</h4><p class="angle">${escape(packet.angle)} · ~${packet.evaluation.estimatedSeconds}s · ${packet.evaluation.wordCount} words</p></div><span class="status ${escape(packet.evaluation.status)}">${escape(packet.evaluation.status.replace(/_/g, " "))}</span></div>
      <ol class="lines">${packet.lines.map((line) => `<li>${escape(line.text)}<span class="line-type">${escape(line.type.replace(/_/g, " "))} · ${escape(line.evidenceIds.join(", ") || "no evidence")}</span></li>`).join("")}</ol>
      <p class="risk">${escape(packet.riskNote)}</p>${errors ? `<p class="gate-error">${errors}</p>` : ""}
      <footer class="packet-footer"><span class="tag">Visuals: ${escape(packet.visualEvidenceIds.join(", ") || "none")}</span><div class="feedback"><button class="keep ${feedback?.action === "keep" ? "selected" : ""}" data-action="keep" data-packet="${escape(packet.id)}">Keep</button><button class="revise ${feedback?.action === "revise" ? "selected" : ""}" data-action="revise" data-packet="${escape(packet.id)}">Revise</button><button class="reject ${feedback?.action === "reject" ? "selected" : ""}" data-action="reject" data-packet="${escape(packet.id)}">Reject</button></div></footer>
    </article>`;
  }).join("");
  list.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => saveFeedback(button.dataset.packet, button.dataset.action)));
}

async function generatePackets(button) {
  button.disabled = true;
  setMessage("Generating and grading candidate takes…");
  try {
    const writer = projectRoot.querySelector(".writer-select").value;
    const { project } = await request(`/api/projects/${currentProject.id}/packets`, { method: "POST", body: JSON.stringify({ count: 12, writer }) });
    renderProject(project);
    setMessage("Candidate batch is ready. Keep what lands and reject what does not.", true);
  } catch (error) { setMessage(error.message); } finally { button.disabled = false; }
}

async function saveFeedback(packetId, action) {
  try {
    const { project } = await request(`/api/projects/${currentProject.id}/feedback`, { method: "POST", body: JSON.stringify({ packetId, action }) });
    currentProject = project;
    renderPackets();
    setMessage(`${action[0].toUpperCase()}${action.slice(1)} feedback saved.`, true);
  } catch (error) { setMessage(error.message); }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = document.querySelector("#create-button");
  const data = new FormData(form);
  button.disabled = true;
  setMessage("Pinning repository, extracting evidence, and researching public perception…");
  try {
    const { project } = await request("/api/projects", { method: "POST", body: JSON.stringify(Object.fromEntries(data)) });
    renderProject(project);
    setMessage("Evidence pack created. Review it before generating candidates.", true);
  } catch (error) { setMessage(error.message); } finally { button.disabled = false; }
});

request("/api/health").then(({ providers }) => {
  const active = Object.entries(providers).filter(([, value]) => value).map(([name]) => name);
  document.querySelector("#provider-status").textContent = active.length ? `Connected: ${active.join(" · ")}` : "Demo mode: GitHub is available; add provider keys for research and generation.";
}).catch(() => { document.querySelector("#provider-status").textContent = "Local app ready."; });
