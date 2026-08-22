import { TEMPLATES } from '../templates.js';
import { posterStyle, esc, SHEEN_CSS } from '../shared.js';

// A — Premiere. Closest to the Stanley reference: one black cinematic screen,
// one promise, one CTA. Templates are deliberately BELOW the fold, as a single
// scrubbable filmstrip, so the first impression is the product's attitude
// rather than its catalogue.

export const key = 'A';
export const name = 'Premiere — cinematic hero, filmstrip below';

export function render(root) {
  const strip = TEMPLATES.map((t) => `
    <button class="cell">
      <span class="poster ph-sheen" style="${posterStyle(t)}"><i class="ph">placeholder</i></span>
      <b>${esc(t.title)}</b>
      <span class="meta">${esc(t.format)} · ${t.dur}</span>
    </button>`).join('');

  root.innerHTML = `
  <style>
    ${SHEEN_CSS}
    .a{background:#000;color:#f5f5f7;font:400 16px/1.4 ui-sans-serif,-apple-system,system-ui,sans-serif;
       -webkit-font-smoothing:antialiased}
    .a nav{position:fixed;inset:0 0 auto;z-index:50;display:flex;align-items:center;justify-content:space-between;
       padding:30px 50px;mix-blend-mode:difference}
    .a nav b{font-size:30px;font-weight:600;letter-spacing:-.02em}
    .a nav .lg{font-size:14px;color:#f5f5f7;opacity:.7;margin-right:18px}
    .a .pill{display:inline-flex;align-items:center;gap:10px;border:1px solid #6b57ff;border-radius:40px;
       padding:16px 38px;font-weight:600;letter-spacing:-.02em;color:#fff;background:rgba(0,0,0,.2);
       box-shadow:0 0 0 1px rgba(107,87,255,.35),0 18px 48px rgba(0,0,0,.4);backdrop-filter:blur(3px);
       transition:.2s;cursor:pointer}
    .a .pill:hover{transform:translateY(-1px);background:rgba(107,87,255,.12);
       box-shadow:0 0 0 1px rgba(107,87,255,.65),0 18px 54px rgba(107,87,255,.22)}
    .a nav .pill{padding:8px 22px;font-size:14px;border-color:rgba(255,255,255,.7);box-shadow:none}

    .a .hero{position:relative;isolation:isolate;min-height:100vh;display:flex;flex-direction:column;
       align-items:center;justify-content:flex-end;padding:120px 20px 11vh;text-align:center;overflow:hidden}
    .a .bg{position:absolute;inset:0;z-index:0;display:grid;grid-template-columns:repeat(4,1fr);
       grid-template-rows:repeat(2,1fr);filter:saturate(.75)}
    .a .bg span{animation:a-breathe 9s ease-in-out infinite alternate}
    .a .bg span:nth-child(2n){animation-delay:-3s}
    .a .bg span:nth-child(3n){animation-delay:-5.5s}
    @keyframes a-breathe{to{transform:scale(1.08)}}
    .a .scrim{position:absolute;inset:0;z-index:1;background:rgba(0,0,0,.52)}
    .a .scrim2{position:absolute;inset:0;z-index:2;background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,
       rgba(0,0,0,.1) 32%,rgba(0,0,0,.6) 70%,#000 100%)}
    .a h1{position:relative;z-index:10;margin:0 0 22px;font-size:clamp(40px,7.4vw,84px);font-weight:500;
       line-height:.98;letter-spacing:-.02em}
    .a h1 em{font-weight:700;font-style:italic}
    .a p.sub{position:relative;z-index:10;max-width:720px;margin:0 0 34px;font-size:clamp(17px,2vw,23px);
       line-height:1.25;color:#e9e9ee}
    .a .cta{position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;gap:14px}
    .a .fine{font-size:12px;color:#8a8a96}
    .a .scrollcue{position:absolute;z-index:10;bottom:26px;left:50%;transform:translateX(-50%);
       font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#7a7a86}

    .a .strip{padding:96px 0 120px;border-top:1px solid #17171d}
    .a .strip header{display:flex;align-items:flex-end;justify-content:space-between;padding:0 50px 26px}
    .a .strip h2{margin:0;font-size:clamp(26px,3.4vw,40px);font-weight:500;letter-spacing:-.02em}
    .a .strip h2 em{font-style:italic;font-weight:700}
    .a .strip .count{font-size:13px;color:#7a7a86;letter-spacing:.12em;text-transform:uppercase}
    .a .rail{display:flex;gap:14px;overflow-x:auto;padding:0 50px 22px;scroll-snap-type:x mandatory;
       scrollbar-width:thin;scrollbar-color:#2a2a33 transparent}
    .a .cell{flex:0 0 232px;scroll-snap-align:start;background:none;border:0;padding:0;color:inherit;
       text-align:left;cursor:pointer}
    .a .poster{display:block;aspect-ratio:9/16;border-radius:14px;border:1px solid rgba(255,255,255,.09);
       transition:.25s}
    .a .cell:hover .poster{transform:translateY(-6px) scale(1.015);border-color:rgba(255,255,255,.3)}
    .a .ph{position:absolute;left:10px;bottom:10px;z-index:3;font-style:normal;font-size:9px;
       letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.62)}
    .a .cell b{display:block;margin:14px 0 4px;font-size:15px;font-weight:600;letter-spacing:-.01em}
    .a .cell .meta{font-size:12.5px;color:#7a7a86}
  </style>

  <div class="a">
    <nav><b>Roastr</b><div><a class="lg">Log In</a><button class="pill">Roast my repo</button></div></nav>

    <section class="hero">
      <div class="bg">${TEMPLATES.slice(0, 8).map((t) => `<span style="${posterStyle(t)}"></span>`).join('')}</div>
      <div class="scrim"></div><div class="scrim2"></div>
      <h1>Your repo has <em>notes</em><br>for you.</h1>
      <p class="sub">Paste a GitHub URL. We read the issues, the commits and the comment section,
        then hand it all to someone with a microphone and no manners.</p>
      <div class="cta">
        <button class="pill">Roast my repo <span>→</span></button>
        <span class="fine">Free preview · you approve the script before anything renders</span>
      </div>
      <span class="scrollcue">16 formats below</span>
    </section>

    <section class="strip">
      <header>
        <h2>Pick a <em>format</em>. We'll cast the rest.</h2>
        <span class="count">16 templates · scroll →</span>
      </header>
      <div class="rail">${strip}</div>
    </section>
  </div>`;
}
