import { TEMPLATES, TAGS } from '../templates.js';
import { posterStyle, esc, SHEEN_CSS } from '../shared.js';

// D — Wall. Volume as the pitch. The headline sits ON a live mosaic of every
// sample at once, sized by heat, so "there are loads of these" is the first
// thing you feel. Filters and the repo input float over the wall.

export const key = 'D';
export const name = 'Wall — heat-ranked mosaic, headline overlaid';

export function render(root) {
  const tiles = TEMPLATES.map((t, i) => {
    const big = t.heat >= 86;
    const wide = t.ratio === '16:9';
    return `
    <figure class="tile${big ? ' big' : ''}${wide ? ' wide' : ''}" style="--d:${(i % 7) * 0.35}s">
      <div class="art ph-sheen" style="${posterStyle(t)}"><span class="ph">placeholder</span></div>
      <figcaption>
        <span class="rank">#${i + 1}</span>
        <b>${esc(t.title)}</b>
        <span class="hook">${esc(t.hook)}</span>
        <span class="foot">${esc(t.format)} · ${t.ratio} · ${t.dur}<i>${t.heat}° heat</i></span>
        <button>Use template</button>
      </figcaption>
    </figure>`;
  }).join('');

  root.innerHTML = `
  <style>
    ${SHEEN_CSS}
    .d{background:#0a0a0f;color:#fff;min-height:100vh;
       font:400 16px/1.45 ui-sans-serif,-apple-system,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
    .d .stage{position:relative;padding:0 0 90px}
    .d .overlay{position:sticky;top:0;z-index:40;padding:26px 34px 20px;
       background:linear-gradient(180deg,#0a0a0f 58%,rgba(10,10,15,0));backdrop-filter:blur(2px)}
    .d .bar{display:flex;align-items:center;justify-content:space-between;gap:20px}
    .d .brand{font-size:23px;font-weight:700;letter-spacing:-.03em}
    .d .brand i{font-style:normal;color:#ff4d3d}
    .d .find{flex:1;max-width:520px;display:flex;gap:8px;padding:7px 7px 7px 18px;border-radius:12px;
       background:#15151d;border:1px solid #24242e}
    .d .find input{flex:1;background:none;border:0;color:#fff;font-size:14.5px;outline:none}
    .d .find input::placeholder{color:#63636f}
    .d .find button{border:0;border-radius:8px;background:#ff4d3d;color:#fff;font:650 13.5px/1 inherit;
       padding:11px 18px;cursor:pointer}
    .d .login{font-size:14px;color:#8b8b98}

    .d .banner{position:relative;z-index:30;padding:44px 34px 30px;display:grid;
       grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:30px}
    .d h1{margin:0;font-size:clamp(38px,7vw,92px);font-weight:800;line-height:.92;letter-spacing:-.045em;
       text-wrap:balance}
    .d h1 em{font-style:italic;color:#ff4d3d}
    .d .banner p{margin:16px 0 0;font-size:18px;color:#9b9baa;max-width:48ch}
    .d .chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
    .d .chips button{border:1px solid #2a2a36;background:#13131b;color:#a9a9b8;border-radius:999px;
       padding:9px 17px;font-size:13px;cursor:pointer}
    .d .chips button.on{background:#fff;color:#000;border-color:#fff;font-weight:600}

    .d .wall{padding:14px 34px 0;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));
       grid-auto-rows:150px;gap:12px}
    .d .tile{margin:0;position:relative;border-radius:16px;overflow:hidden;grid-row:span 2;
       border:1px solid #1c1c25;cursor:pointer;animation:d-in .5s var(--d) both}
    @keyframes d-in{from{opacity:0;transform:translateY(14px)}}
    .d .tile.big{grid-row:span 3}
    .d .tile.wide{grid-column:span 2;grid-row:span 2}
    .d .art{position:absolute;inset:0}
    .d .ph{position:absolute;left:12px;top:12px;z-index:3;font-size:8.5px;letter-spacing:.22em;
       text-transform:uppercase;color:rgba(255,255,255,.6)}
    .d figcaption{position:absolute;inset:auto 0 0;z-index:4;padding:16px 15px 15px;display:grid;gap:6px;
       background:linear-gradient(180deg,transparent,rgba(6,6,10,.82) 34%,rgba(6,6,10,.97))}
    .d .rank{font:600 10.5px/1 ui-monospace,monospace;letter-spacing:.14em;color:#ff8a7d}
    .d figcaption b{font-size:16.5px;font-weight:650;letter-spacing:-.02em}
    .d .hook{font-size:12.5px;color:#a9a9b8;max-height:0;opacity:0;overflow:hidden;transition:.24s}
    .d .foot{display:flex;justify-content:space-between;font-size:11px;color:#7b7b8a}
    .d .foot i{font-style:normal;color:#ff4d3d}
    .d figcaption button{margin-top:4px;max-height:0;opacity:0;padding:0;border:0;overflow:hidden;
       border-radius:8px;background:#fff;color:#000;font:650 12.5px/1 inherit;cursor:pointer;transition:.24s}
    .d .tile:hover{border-color:#3a3a4a}
    .d .tile:hover .hook{max-height:60px;opacity:1}
    .d .tile:hover figcaption button{max-height:40px;opacity:1;padding:10px}

    .d .more{margin:34px auto 0;display:block;border:1px solid #2a2a36;background:#13131b;color:#d6d6e2;
       border-radius:999px;padding:14px 30px;font-size:14px;cursor:pointer}
  </style>

  <div class="d"><div class="stage">
    <div class="overlay"><div class="bar">
      <span class="brand">ROAST<i>R</i></span>
      <div class="find"><input placeholder="Drop a repo or product URL" aria-label="Repository URL"><button>Roast it</button></div>
      <span class="login">Log in</span>
    </div></div>

    <div class="banner">
      <div>
        <h1>16 ways to get<br><em>absolutely cooked</em>.</h1>
        <p>Every template below is a real format, researched from your repo's own issues, commits
          and comment sections. Pick one, approve the script, render.</p>
      </div>
      <div class="chips">${TAGS.map((t, i) => `<button class="${i ? '' : 'on'}">${esc(t)}</button>`).join('')}</div>
    </div>

    <div class="wall">${tiles}</div>
    <button class="more">Show all formats</button>
  </div></div>`;
}
