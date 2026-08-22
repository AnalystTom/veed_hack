import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const sharedRoot = path.resolve("evals/shared-runs");
const guidelinesPath = path.resolve("joke_guidelines.md");
const header = "run_id,packet_id,decision,rank,reason,notes,mechanics,tone,grounding";

function candidateLabel(index) {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label.toLowerCase();
}

function parseArgs(args) {
  const options = { port: 4174 };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--arena") options.arena = args[++index];
    else if (value === "--port") options.port = Number(args[++index]) || 4174;
    else if (value === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!options.help && !options.arena) throw new Error("Usage: npm run evals:reviewer -- --arena evals/shared-runs/<arena-id> [--port 4174]");
  return options;
}

function csvEscape(value) {
  const text = String(value || "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted && character === '"' && text[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(value); value = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  row.push(value);
  if (row.some(Boolean)) rows.push(row);
  const [headers = [], ...data] = rows;
  return Object.fromEntries(data.map((values) => [values[0], Object.fromEntries(headers.map((key, index) => [key, values[index] || ""]))]));
}

export function reviewCsv(reviews, count) {
  const rows = Array.from({ length: count }, (_, index) => {
    const review = reviews[`candidate-${candidateLabel(index)}`] || {};
    return [
      `candidate-${candidateLabel(index)}`,
      "packet-1",
      review.decision,
      review.rank,
      review.reason,
      review.notes,
      review.mechanics,
      review.tone,
      review.grounding,
    ].map(csvEscape).join(",");
  });
  return `${header}\n${rows.join("\n")}\n`;
}

function visibleCandidates(results) {
  return results.filter((result) => !result.failed && !result.skipped && result.script).map((result, index) => ({
    id: `candidate-${candidateLabel(index)}`,
    script: result.script,
  }));
}

function stableHash(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function buildPairs(candidates) {
  const pairs = [];
  for (let leftIndex = 0; leftIndex < candidates.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < candidates.length; rightIndex += 1) {
      const first = candidates[leftIndex];
      const second = candidates[rightIndex];
      const id = `${first.id}__${second.id}`;
      const flipped = Number.parseInt(stableHash(id).slice(0, 2), 16) % 2 === 1;
      pairs.push({ id, left: flipped ? second : first, right: flipped ? first : second });
    }
  }
  return pairs.sort((left, right) => stableHash(left.id).localeCompare(stableHash(right.id)));
}

function page() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FunnyBench pair review</title><style>
*{box-sizing:border-box}body{margin:0;background:#0d0e12;color:#f5f4ef;font:15px/1.55 ui-sans-serif,system-ui,sans-serif}.shell{max-width:1200px;margin:auto;padding:28px 18px 90px}header{display:flex;justify-content:space-between;align-items:start;gap:16px;border-bottom:1px solid #282b34;padding-bottom:18px}h1{margin:0;font-size:27px;letter-spacing:-.7px}.sub,.hint{color:#aeb4c2;margin:4px 0}.status{color:#8fd6a6;font-size:13px;white-space:nowrap}.guidelines,.option{background:#171920;border:1px solid #2c303b;border-radius:14px;padding:22px;box-shadow:0 8px 28px #0002}.guidelines{margin:20px 0}.guidelines summary{cursor:pointer;font-weight:750}.guidelines textarea{width:100%;min-height:330px;margin-top:14px;border-radius:9px;border:1px solid #3a3e4c;background:#101217;color:#f5f4ef;padding:12px;font:13px/1.55 ui-monospace,monospace;resize:vertical}.guideline-actions{display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:12px}.pair-meta{text-align:center;margin:30px 0 16px;color:#aeb4c2;font-weight:700}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}.option{min-height:380px;display:flex;flex-direction:column}.option-label{font:700 12px/1.2 ui-monospace,monospace;letter-spacing:1.2px;color:#8da0ff}.script{font:19px/1.72 Georgia,serif;white-space:pre-wrap;flex:1;margin:13px 0 22px}.comment{width:100%;min-height:65px;margin:14px 0 0;border-radius:9px;border:1px solid #3a3e4c;background:#101217;color:#f5f4ef;padding:10px;font:inherit;resize:vertical}.choice{border:1px solid #4e628d;background:#253a61;color:white;border-radius:10px;padding:12px;font-weight:800;cursor:pointer;font-size:15px}.tie{display:block;margin:14px auto;border:1px solid #3d4351;background:#20232c;color:#e8e9ee;border-radius:9px;padding:9px 18px;cursor:pointer}.done{text-align:center;padding:80px 10px;font-size:20px}.save{border:0;background:#b3f09d;color:#102112;border-radius:9px;padding:10px 16px;font-weight:800;cursor:pointer}.keys{text-align:center;color:#888f9f;font-size:13px}@media(max-width:720px){header{display:block}.status{margin-top:8px}.pair{grid-template-columns:1fr}.option{min-height:auto}.script{font-size:17px}}</style></head><body><main class="shell"><header><div><h1>FunnyBench pair review</h1><p class="sub">Which script lands better? Providers, prompts, and candidate IDs stay hidden.</p></div><span class="status" id="status">Loading…</span></header><details class="guidelines"><summary>Joke guidelines — main system prompt</summary><textarea id="guidelines" spellcheck="false" placeholder="Loading guidelines…"></textarea><div class="guideline-actions"><span class="hint">Save a revision, then create a fresh arena. This current arena stays frozen.</span><button class="save" id="save-guidelines">Save guidelines</button></div></details><section id="pair"></section></main><script>
let data,answers={},index=0;function esc(s){return String(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}function nextIndex(){const open=data.pairs.findIndex(p=>!answers[p.id]);return open<0?data.pairs.length:open}function render(){index=nextIndex();const root=document.querySelector('#pair');document.querySelector('#status').textContent=Object.keys(answers).length+' / '+data.pairs.length+' comparisons';if(index>=data.pairs.length){root.innerHTML='<div class="done">All comparisons labelled. Nice. Your pairwise preferences are saved.</div>';return}const p=data.pairs[index],answer=answers[p.id]||{};root.innerHTML='<div class="pair-meta">Comparison '+(index+1)+' of '+data.pairs.length+'</div><div class="pair"><article class="option"><div class="option-label">OPTION A</div><div class="script">'+esc(p.left.script)+'</div><button class="choice" data-choice="left">← Option A is better</button></article><article class="option"><div class="option-label">OPTION B</div><div class="script">'+esc(p.right.script)+'</div><button class="choice" data-choice="right">Option B is better →</button></article></div><textarea class="comment" id="comment" placeholder="Optional: why did this one land better? Keep the useful prompt signal.">'+esc(answer.comment||'')+'</textarea><button class="tie" data-choice="tie">About equal</button><p class="keys">Keyboard: ← A wins · → B wins · = tie</p>';document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>choose(b.dataset.choice));}async function choose(choice){const p=data.pairs[index],comment=document.querySelector('#comment')?.value||'';answers[p.id]={choice,comment,reviewedAt:new Date().toISOString()};render();await fetch('/api/pairs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({answers})});}document.addEventListener('keydown',e=>{if(e.target.tagName==='TEXTAREA')return;if(e.key==='ArrowLeft')choose('left');if(e.key==='ArrowRight')choose('right');if(e.key==='=')choose('tie');});document.querySelector('#save-guidelines').onclick=async()=>{const b=document.querySelector('#save-guidelines');b.textContent='Saving…';const res=await fetch('/api/guidelines',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({guidelines:document.querySelector('#guidelines').value})});b.textContent=res.ok?'Saved ✓':'Save failed';setTimeout(()=>b.textContent='Save guidelines',1500)};Promise.all([fetch('/api/pairs').then(r=>r.json()),fetch('/api/guidelines').then(r=>r.json())]).then(([pairs,guidelines])=>{data=pairs;answers=pairs.answers||{};document.querySelector('#guidelines').value=guidelines.guidelines||'';render()}).catch(()=>document.querySelector('#status').textContent='Could not load arena');
</script></body></html>`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { console.log("Usage: npm run evals:reviewer -- --arena evals/shared-runs/<arena-id> [--port 4174]"); return; }
  const arena = path.resolve(options.arena);
  if (!arena.startsWith(`${sharedRoot}${path.sep}`)) throw new Error("Arena must be beneath evals/shared-runs.");
  const resultsPath = path.join(arena, "results.json");
  const reviewPath = path.join(arena, "review.csv");
  const pairwisePath = path.join(arena, "pairwise-review.json");
  const server = createServer(async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/") { response.writeHead(200, { "content-type": "text/html; charset=utf-8" }); response.end(page()); return; }
      if (request.method === "GET" && request.url === "/api/pairs") {
        const results = JSON.parse(await readFile(resultsPath, "utf8"));
        const saved = await readFile(pairwisePath, "utf8").then(JSON.parse).catch(() => ({ answers: {} }));
        response.writeHead(200, { "content-type": "application/json" }); response.end(JSON.stringify({ pairs: buildPairs(visibleCandidates(results)), answers: saved.answers || {} })); return;
      }
      if (request.method === "GET" && request.url === "/api/guidelines") {
        response.writeHead(200, { "content-type": "application/json" }); response.end(JSON.stringify({ guidelines: await readFile(guidelinesPath, "utf8") })); return;
      }
      if (request.method === "POST" && request.url === "/api/guidelines") {
        let body = "";
        for await (const chunk of request) { body += chunk; if (body.length > 200_000) throw new Error("Guidelines payload is too large."); }
        const guidelines = String(JSON.parse(body).guidelines || "").trim();
        if (guidelines.length < 80) throw new Error("Keep at least 80 characters of grounded comedy guidance.");
        await writeFile(guidelinesPath, `${guidelines}\n`);
        response.writeHead(204); response.end(); return;
      }
      if (request.method === "POST" && request.url === "/api/pairs") {
        let body = "";
        for await (const chunk of request) { body += chunk; if (body.length > 1_000_000) throw new Error("Pairwise review payload is too large."); }
        const submitted = JSON.parse(body).answers || {};
        const results = JSON.parse(await readFile(resultsPath, "utf8"));
        const allowed = new Set(buildPairs(visibleCandidates(results)).map((pair) => pair.id));
        const answers = Object.fromEntries(Object.entries(submitted).filter(([id, value]) => allowed.has(id) && ["left", "right", "tie"].includes(value?.choice)).map(([id, value]) => [id, { choice: value.choice, comment: String(value.comment || "").slice(0, 2_000), reviewedAt: value.reviewedAt || new Date().toISOString() }]));
        await writeFile(pairwisePath, `${JSON.stringify({ updatedAt: new Date().toISOString(), answers }, null, 2)}\n`);
        response.writeHead(204); response.end(); return;
      }
      response.writeHead(404); response.end();
    } catch (error) { response.writeHead(400, { "content-type": "application/json" }); response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Review server error." })); }
  });
  server.listen(options.port, "127.0.0.1", () => console.log(`FunnyBench reviewer: http://127.0.0.1:${options.port}`));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
