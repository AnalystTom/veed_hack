import { TEMPLATES } from '../templates.js';
import { posterStyle, esc, SHEEN_CSS } from '../shared.js';

// C — Ledger. Deliberately anti-cinematic: a developer tool, not a media brand.
// Light, monospaced, terminal intake at the top, and the sample library as a
// dense sortable TABLE with a sticky preview pane. Tests whether the audience
// (people who will be roasted) responds better to receipts than to spectacle.

export const key = 'C';
export const name = 'Ledger — dev-native table + sticky preview';

export function render(root) {
  const rows = TEMPLATES.map((t, i) => `
    <tr data-i="${i}" ${i === 0 ? 'class="on"' : ''}>
      <td class="n">${String(i + 1).padStart(2, '0')}</td>
      <td class="t"><b>${esc(t.title)}</b><span>${esc(t.hook)}</span></td>
      <td>${esc(t.format)}</td>
      <td>${esc(t.tone)}</td>
      <td class="mono">${t.ratio}</td>
      <td class="mono">${t.dur}</td>
      <td><span class="bar"><i style="width:${t.heat}%"></i></span></td>
      <td class="pick"><button>use →</button></td>
    </tr>`).join('');

  root.innerHTML = `
  <style>
    ${SHEEN_CSS}
    .c{--ink:#12121a;--dim:#6a6a7a;--line:#e2e2ea;--acc:#4b32d6;
       background:#f7f7f9;color:var(--ink);min-height:100vh;
       font:400 15px/1.5 ui-sans-serif,-apple-system,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
    .c .mono,.c .term{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .c header.top{display:flex;align-items:center;justify-content:space-between;padding:20px 40px;
       border-bottom:1px solid var(--line);background:#fff}
    .c .brand{font:650 19px/1 ui-monospace,monospace;letter-spacing:-.02em}
    .c .brand span{color:var(--acc)}
    .c .top nav{display:flex;gap:26px;font-size:14px;color:var(--dim)}

    .c .intake{padding:76px 40px 60px;background:#fff;border-bottom:1px solid var(--line)}
    .c .intake .wrap{max-width:960px;margin:0 auto}
    .c h1{margin:0 0 14px;font-size:clamp(32px,4.6vw,54px);font-weight:600;line-height:1.02;
       letter-spacing:-.035em;max-width:16ch}
    .c h1 u{text-decoration:none;background:linear-gradient(transparent 62%,#ffe14d 62%)}
    .c .lede{margin:0 0 34px;font-size:18px;color:var(--dim);max-width:56ch}
    .c .term{background:#0e0e14;color:#e6e6f0;border-radius:12px;padding:18px 20px;font-size:14px;
       box-shadow:0 14px 40px rgba(16,16,32,.16)}
    .c .term .ln{display:flex;gap:10px;align-items:center}
    .c .term .ln + .ln{margin-top:10px;color:#8d8da0}
    .c .term .p{color:#5ce39b}
    .c .term input{flex:1;background:none;border:0;color:#fff;font:inherit;outline:none}
    .c .term input::placeholder{color:#565668}
    .c .term button{border:0;border-radius:7px;background:var(--acc);color:#fff;font:600 13px/1 inherit;
       padding:9px 16px;cursor:pointer}
    .c .facts{display:flex;gap:34px;margin-top:26px;font-size:13px;color:var(--dim)}
    .c .facts b{display:block;font-size:22px;color:var(--ink);font-weight:600;letter-spacing:-.02em}

    .c .lib{display:grid;grid-template-columns:minmax(0,1fr) 336px;gap:0;align-items:start}
    .c .libhead{grid-column:1/-1;display:flex;align-items:baseline;justify-content:space-between;
       padding:34px 40px 14px}
    .c .libhead h2{margin:0;font-size:15px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim)}
    .c .libhead .filters{display:flex;gap:6px}
    .c .filters button{border:1px solid var(--line);background:#fff;border-radius:7px;padding:6px 12px;
       font-size:12.5px;cursor:pointer;color:var(--dim)}
    .c .filters button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
    .c table{width:100%;border-collapse:collapse;font-size:14px}
    .c thead th{position:sticky;top:0;background:#f7f7f9;text-align:left;font-weight:500;font-size:11px;
       letter-spacing:.14em;text-transform:uppercase;color:var(--dim);padding:10px 12px;
       border-bottom:1px solid var(--line)}
    .c thead th:first-child{padding-left:40px}
    .c tbody td{padding:13px 12px;border-bottom:1px solid var(--line);vertical-align:middle}
    .c tbody td:first-child{padding-left:40px}
    .c tbody tr{cursor:pointer}
    .c tbody tr:hover{background:#fff}
    .c tbody tr.on{background:#fff;box-shadow:inset 3px 0 0 var(--acc)}
    .c td.n{font:500 12px/1 ui-monospace,monospace;color:#b3b3c0}
    .c td.t b{display:block;font-weight:600;letter-spacing:-.01em}
    .c td.t span{display:block;font-size:12.5px;color:var(--dim);max-width:46ch}
    .c td.mono{font-family:ui-monospace,monospace;font-size:13px;color:var(--dim)}
    .c .bar{display:block;width:58px;height:5px;border-radius:3px;background:var(--line);overflow:hidden}
    .c .bar i{display:block;height:100%;background:var(--acc)}
    .c td.pick button{border:1px solid var(--line);background:#fff;border-radius:7px;padding:6px 12px;
       font-size:12.5px;cursor:pointer}
    .c td.pick button:hover{border-color:var(--acc);color:var(--acc)}

    .c .preview{position:sticky;top:14px;margin:0 40px 60px 22px;padding:14px;background:#fff;
       border:1px solid var(--line);border-radius:14px}
    .c .preview .shot{aspect-ratio:9/16;border-radius:10px;overflow:hidden}
    .c .preview .ph{position:absolute;left:10px;top:10px;z-index:3;font-size:9px;letter-spacing:.2em;
       text-transform:uppercase;color:rgba(255,255,255,.7)}
    .c .preview h3{margin:14px 0 6px;font-size:17px;font-weight:600;letter-spacing:-.02em}
    .c .preview p{margin:0 0 14px;font-size:13.5px;color:var(--dim)}
    .c .preview dl{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:0 0 16px;font-size:13px}
    .c .preview dt{color:var(--dim)}
    .c .preview dd{margin:0;font-family:ui-monospace,monospace}
    .c .preview .go{width:100%;border:0;border-radius:9px;background:var(--acc);color:#fff;
       font:600 14px/1 inherit;padding:13px;cursor:pointer}
  </style>

  <div class="c">
    <header class="top">
      <span class="brand">roastr<span>/</span>cli</span>
      <nav><a>Templates</a><a>How it reads your repo</a><a>Pricing</a><a>Log in</a></nav>
    </header>

    <section class="intake"><div class="wrap">
      <h1>Sixteen ways to be <u>publicly humbled</u> by your own repo.</h1>
      <p class="lede">Point it at a public repo or product URL. It reads the issues, the commits,
        the changelog and what the internet said — then shows you every receipt before it renders a frame.</p>
      <div class="term">
        <div class="ln"><span class="p">$</span>
          <input placeholder="roastr https://github.com/you/your-repo" aria-label="Repository URL">
          <button>Run</button></div>
        <div class="ln"><span>→</span><span>reads: issues · commits · README · changelog · public discussion</span></div>
      </div>
      <div class="facts">
        <div><b>16</b>sample formats</div>
        <div><b>0</b>frames rendered before you approve</div>
        <div><b>100%</b>claims linked to a source</div>
      </div>
    </div></section>

    <section class="lib">
      <div class="libhead">
        <h2>Sample library</h2>
        <div class="filters"><button class="on">All</button><button>Repo</button><button>Product</button><button>Web</button></div>
      </div>
      <div>
        <table>
          <thead><tr><th>#</th><th>Template</th><th>Format</th><th>Tone</th><th>Ratio</th><th>Len</th><th>Heat</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="preview" id="c-prev"></div>
    </section>
  </div>`;

  const prev = root.querySelector('#c-prev');
  const paint = (t) => {
    prev.innerHTML = `
      <div class="shot ph-sheen" style="${posterStyle(t)}"><span class="ph">placeholder render</span></div>
      <h3>${esc(t.title)}</h3>
      <p>${esc(t.hook)}</p>
      <dl><dt>Format</dt><dd>${esc(t.format)}</dd>
          <dt>Ratio</dt><dd>${t.ratio}</dd>
          <dt>Length</dt><dd>${t.dur}</dd>
          <dt>Tone</dt><dd>${esc(t.tone)}</dd></dl>
      <button class="go">Use ${esc(t.title)} →</button>`;
  };
  paint(TEMPLATES[0]);
  root.querySelectorAll('tbody tr').forEach((tr) =>
    tr.addEventListener('mouseenter', () => {
      root.querySelectorAll('tbody tr').forEach((x) => x.classList.remove('on'));
      tr.classList.add('on');
      paint(TEMPLATES[Number(tr.dataset.i)]);
    }));
}
