import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const sharedRoot = path.resolve("evals/shared-runs");
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

function page() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FunnyBench reviewer</title><style>
*{box-sizing:border-box}body{margin:0;background:#0d0e12;color:#f5f4ef;font:15px/1.55 ui-sans-serif,system-ui,sans-serif}.shell{max-width:980px;margin:auto;padding:28px 18px 90px}header{position:sticky;top:0;background:#0d0e12eF;backdrop-filter:blur(10px);padding:4px 0 18px;border-bottom:1px solid #282b34;z-index:2}h1{margin:0;font-size:26px;letter-spacing:-.7px}.sub{color:#aeb4c2;margin:4px 0 0}.status{float:right;color:#8fd6a6;font-size:13px}.card{background:#171920;border:1px solid #2c303b;border-radius:14px;margin:22px 0;padding:22px;box-shadow:0 8px 28px #0002}.label{font:700 12px/1.2 ui-monospace,monospace;letter-spacing:1.2px;color:#8da0ff}.script{font:18px/1.65 Georgia,serif;white-space:pre-wrap;margin:13px 0 18px}.controls{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.decision{border:1px solid #3a3e4c;background:#20232c;color:#e8e9ee;border-radius:9px;padding:9px;cursor:pointer;font-weight:650}.decision[data-active=true]{border-color:#91b7ff;background:#23375e;color:#fff}.fields{display:grid;grid-template-columns:80px 1fr 1fr;gap:10px;margin-top:12px}.fields input,.fields textarea{width:100%;border-radius:8px;border:1px solid #3a3e4c;background:#101217;color:#f5f4ef;padding:9px;font:inherit}.fields textarea{min-height:42px;resize:vertical}.tags{margin-top:11px;display:flex;gap:7px;flex-wrap:wrap}.tag{background:#252933;border:1px solid #3b4150;border-radius:999px;padding:5px 9px;cursor:pointer;font-size:12px}.tag[data-active=true]{background:#304a70;border-color:#8eaff1}footer{position:fixed;bottom:0;left:0;right:0;background:#11131aeF;border-top:1px solid #303542;padding:12px}.bar{max-width:980px;margin:auto;display:flex;justify-content:space-between;align-items:center;gap:12px}.save{border:0;background:#b3f09d;color:#102112;border-radius:9px;padding:10px 16px;font-weight:800;cursor:pointer}.hint{color:#aeb4c2;font-size:13px}@media(max-width:650px){.fields{grid-template-columns:1fr}.controls{grid-template-columns:1fr}.status{float:none;display:block;margin-top:8px}}</style></head><body><main class="shell"><header><span class="status" id="status">Loading…</span><h1>FunnyBench review room</h1><p class="sub">Read, react, rank. Providers and prompts remain hidden until after review.</p></header><section id="cards"></section></main><footer><div class="bar"><span class="hint">Rank 1 is best. Label the mechanics that made it work—or fail.</span><button class="save" id="save">Save review</button></div></footer><script>
const mechanics=['specificity','mismatch','escalation','misdirection','callback','grounded','generic','repetitive'];let state={};
function esc(s){return String(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
function render(data){state=data.reviews||{};document.querySelector('#status').textContent=data.candidates.length+' candidates';document.querySelector('#cards').innerHTML=data.candidates.map(c=>{const r=state[c.id]||{};const active=v=>r.decision===v;const tags=(r.mechanics||'').split('|');return '<article class="card" data-id="'+c.id+'"><div class="label">'+c.label+'</div><div class="script">'+esc(c.script)+'</div><div class="controls">'+['keep','revise','reject'].map(v=>'<button class="decision" data-value="'+v+'" data-active="'+active(v)+'">'+v+'</button>').join('')+'</div><div class="fields"><input class="rank" type="number" min="1" max="'+data.candidates.length+'" placeholder="Rank" value="'+esc(r.rank)+'"><textarea class="reason" placeholder="Why did it land or fail?">'+esc(r.reason)+'</textarea><textarea class="notes" placeholder="What to preserve or change">'+esc(r.notes)+'</textarea></div><div class="tags">'+mechanics.map(t=>'<button class="tag" data-tag="'+t+'" data-active="'+tags.includes(t)+'">'+t+'</button>').join('')+'</div></article>'}).join('');}
function collect(){const reviews={};document.querySelectorAll('.card').forEach(card=>{const id=card.dataset.id;const tags=[...card.querySelectorAll('.tag[data-active="true"]')].map(x=>x.dataset.tag);reviews[id]={decision:card.querySelector('.decision[data-active="true"]')?.dataset.value||'',rank:card.querySelector('.rank').value,reason:card.querySelector('.reason').value,notes:card.querySelector('.notes').value,mechanics:tags.join('|'),tone:'',grounding:tags.includes('grounded')?'high':''};});return reviews;}
document.addEventListener('click',e=>{if(e.target.classList.contains('decision')){const card=e.target.closest('.card');card.querySelectorAll('.decision').forEach(x=>x.dataset.active=String(x===e.target));}if(e.target.classList.contains('tag'))e.target.dataset.active=String(e.target.dataset.active!=='true');});document.querySelector('#save').onclick=async()=>{const b=document.querySelector('#save');b.textContent='Saving…';const res=await fetch('/api/reviews',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reviews:collect()})});b.textContent=res.ok?'Saved ✓':'Save failed';setTimeout(()=>b.textContent='Save review',1500)};fetch('/api/arena').then(r=>r.json()).then(render).catch(()=>document.querySelector('#status').textContent='Could not load arena');
</script></body></html>`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { console.log("Usage: npm run evals:reviewer -- --arena evals/shared-runs/<arena-id> [--port 4174]"); return; }
  const arena = path.resolve(options.arena);
  if (!arena.startsWith(`${sharedRoot}${path.sep}`)) throw new Error("Arena must be beneath evals/shared-runs.");
  const resultsPath = path.join(arena, "results.json");
  const reviewPath = path.join(arena, "review.csv");
  const server = createServer(async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/") { response.writeHead(200, { "content-type": "text/html; charset=utf-8" }); response.end(page()); return; }
      if (request.method === "GET" && request.url === "/api/arena") {
        const [results, csv] = await Promise.all([readFile(resultsPath, "utf8").then(JSON.parse), readFile(reviewPath, "utf8")]);
        const visible = results.filter((result) => !result.failed && !result.skipped && result.script).map((result, index) => ({ id: `candidate-${candidateLabel(index)}`, label: `Candidate ${candidateLabel(index).toUpperCase()}`, script: result.script }));
        response.writeHead(200, { "content-type": "application/json" }); response.end(JSON.stringify({ candidates: visible, reviews: parseCsv(csv) })); return;
      }
      if (request.method === "POST" && request.url === "/api/reviews") {
        let body = "";
        for await (const chunk of request) { body += chunk; if (body.length > 1_000_000) throw new Error("Review payload is too large."); }
        const submitted = JSON.parse(body).reviews || {};
        const results = JSON.parse(await readFile(resultsPath, "utf8"));
        const count = results.filter((result) => !result.failed && !result.skipped && result.script).length;
        await writeFile(reviewPath, reviewCsv(submitted, count));
        response.writeHead(204); response.end(); return;
      }
      response.writeHead(404); response.end();
    } catch (error) { response.writeHead(400, { "content-type": "application/json" }); response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Review server error." })); }
  });
  server.listen(options.port, "127.0.0.1", () => console.log(`FunnyBench reviewer: http://127.0.0.1:${options.port}`));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
