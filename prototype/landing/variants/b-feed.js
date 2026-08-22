import { TEMPLATES } from '../templates.js';
import { posterStyle, esc, SHEEN_CSS } from '../shared.js';

// B — Feed. The landing page IS the sample reel. No hero section at all:
// you land inside a full-bleed vertical snap feed of roasts, with a persistent
// repo-input dock. Answers "what do these actually look like?" in zero clicks.

export const key = 'B';
export const name = 'Feed — full-bleed vertical snap reel';

export function render(root) {
  const slides = TEMPLATES.map((t, i) => `
    <article class="slide">
      <div class="canvas ph-sheen" style="${posterStyle(t)}">
        <span class="ph">placeholder render</span>
        <span class="idx">${String(i + 1).padStart(2, '0')} / ${TEMPLATES.length}</span>
      </div>
      <div class="copy">
        <span class="chip">${esc(t.tag)} · ${esc(t.format)}</span>
        <h2>${esc(t.title)}</h2>
        <p>${esc(t.hook)}</p>
        <div class="specs"><span>${t.ratio}</span><span>${t.dur}</span><span>${esc(t.tone)}</span></div>
      </div>
      <aside class="rail">
        <button class="act"><b>▶</b><span>Play</span></button>
        <button class="act"><b>${t.heat}</b><span>heat</span></button>
        <button class="act"><b>↺</b><span>Remix</span></button>
        <button class="act use">Use this</button>
      </aside>
    </article>`).join('');

  root.innerHTML = `
  <style>
    ${SHEEN_CSS}
    .b{height:100vh;background:#08080c;color:#fff;
       font:400 16px/1.45 ui-sans-serif,-apple-system,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
    .b .feed{height:100vh;overflow-y:auto;scroll-snap-type:y mandatory;scrollbar-width:none}
    .b .feed::-webkit-scrollbar{display:none}
    .b .slide{position:relative;height:100vh;scroll-snap-align:start;display:grid;
       grid-template-columns:1fr minmax(300px,420px) 92px;align-items:center;gap:0;
       padding:0 44px;overflow:hidden}
    .b .canvas{position:absolute;inset:0;z-index:0}
    .b .canvas::after{z-index:1}
    .b .slide::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;
       background:linear-gradient(90deg,rgba(0,0,0,.15) 0%,rgba(4,4,8,.9) 46%,rgba(4,4,8,.96) 100%)}
    .b .ph{position:absolute;left:26px;top:26px;z-index:3;font-size:9.5px;letter-spacing:.24em;
       text-transform:uppercase;color:rgba(255,255,255,.65)}
    .b .idx{position:absolute;left:26px;bottom:26px;z-index:3;font:600 12px/1 ui-monospace,monospace;
       letter-spacing:.1em;color:rgba(255,255,255,.6)}
    .b .copy{position:relative;z-index:2;grid-column:2}
    .b .chip{display:inline-block;margin-bottom:18px;padding:6px 13px;border-radius:999px;
       border:1px solid rgba(255,255,255,.22);font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;
       color:#d6d6e0}
    .b .copy h2{margin:0 0 14px;font-size:clamp(34px,4.6vw,58px);font-weight:600;line-height:1;
       letter-spacing:-.03em}
    .b .copy p{margin:0 0 24px;font-size:19px;line-height:1.35;color:#b9b9c6;max-width:34ch}
    .b .specs{display:flex;gap:8px}
    .b .specs span{padding:5px 11px;border-radius:7px;background:rgba(255,255,255,.07);font-size:12px;
       color:#cfcfda}
    .b .rail{position:relative;z-index:2;grid-column:3;display:flex;flex-direction:column;gap:14px;
       align-items:stretch;text-align:center}
    .b .act{border:0;border-radius:14px;background:rgba(255,255,255,.09);color:#fff;padding:12px 0;
       cursor:pointer;display:grid;gap:3px;backdrop-filter:blur(8px);transition:.18s}
    .b .act:hover{background:rgba(255,255,255,.18)}
    .b .act b{font-size:17px}
    .b .act span{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#c6c6d2}
    .b .act.use{background:#6b57ff;font-weight:650;font-size:12px;padding:14px 6px;line-height:1.2}
    .b .act.use:hover{background:#7f6dff}

    .b .dock{position:fixed;z-index:60;left:44px;top:34px;right:44px;display:flex;align-items:center;
       justify-content:space-between;gap:24px;pointer-events:none}
    .b .dock > *{pointer-events:auto}
    .b .brand{font-size:24px;font-weight:650;letter-spacing:-.02em}
    .b .input{flex:1;max-width:560px;display:flex;align-items:center;gap:10px;padding:8px 8px 8px 20px;
       border-radius:999px;background:rgba(14,14,20,.72);border:1px solid rgba(255,255,255,.14);
       backdrop-filter:blur(14px)}
    .b .input input{flex:1;background:none;border:0;color:#fff;font-size:15px;outline:none}
    .b .input input::placeholder{color:#7c7c8c}
    .b .input button{border:0;border-radius:999px;background:#fff;color:#000;font-weight:650;font-size:14px;
       padding:11px 22px;cursor:pointer}
    .b .hint{font-size:12px;color:#7c7c8c;letter-spacing:.04em}
    .b .cue{position:fixed;z-index:60;right:44px;bottom:92px;font-size:11px;letter-spacing:.24em;
       text-transform:uppercase;color:#6d6d7c;writing-mode:vertical-rl}
  </style>

  <div class="b">
    <div class="dock">
      <span class="brand">Roastr</span>
      <div class="input">
        <input placeholder="github.com/you/your-repo" aria-label="Repository URL">
        <button>Roast it</button>
      </div>
      <span class="hint">Scroll · 16 sample roasts</span>
    </div>
    <div class="feed">${slides}</div>
    <span class="cue">keep scrolling</span>
  </div>`;
}
