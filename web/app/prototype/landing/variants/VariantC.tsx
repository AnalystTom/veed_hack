'use client';

import { useState } from 'react';
import { TEMPLATES, TAGS } from '../templates';
import { posterStyle, SHEEN_CSS } from '../shared';

// C — Ledger. Deliberately anti-cinematic: a developer tool, not a media brand.
// Light, monospaced, terminal intake at the top, and the sample library as a
// dense TABLE with a sticky preview pane. Tests whether the audience (people who
// will be roasted) responds better to receipts than to spectacle.


const CSS = `
${SHEEN_CSS}
.rp-c{--ink:#12121a;--dim:#6a6a7a;--line:#e2e2ea;--acc:#4b32d6;
   background:#f7f7f9;color:var(--ink);min-height:100vh;
   font:400 15px/1.5 ui-sans-serif,-apple-system,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.rp-c .rp-mono,.rp-c .rp-term{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.rp-c header.rp-top{display:flex;align-items:center;justify-content:space-between;padding:20px 40px;
   border-bottom:1px solid var(--line);background:#fff}
.rp-c .rp-brand{font:650 19px/1 ui-monospace,monospace;letter-spacing:-.02em}
.rp-c .rp-brand span{color:var(--acc)}
.rp-c .rp-top nav{display:flex;gap:26px;font-size:14px;color:var(--dim)}

.rp-c .rp-intake{padding:76px 40px 60px;background:#fff;border-bottom:1px solid var(--line)}
.rp-c .rp-intake .rp-wrap{max-width:960px;margin:0 auto}
.rp-c h1{margin:0 0 14px;font-size:clamp(32px,4.6vw,54px);font-weight:600;line-height:1.02;
   letter-spacing:-.035em;max-width:16ch}
.rp-c h1 u{text-decoration:none;background:linear-gradient(transparent 62%,#ffe14d 62%)}
.rp-c .rp-lede{margin:0 0 34px;font-size:18px;color:var(--dim);max-width:56ch}
.rp-c .rp-term{background:#0e0e14;color:#e6e6f0;border-radius:12px;padding:18px 20px;font-size:14px;
   box-shadow:0 14px 40px rgba(16,16,32,.16)}
.rp-c .rp-term .rp-ln{display:flex;gap:10px;align-items:center}
.rp-c .rp-term .rp-ln + .rp-ln{margin-top:10px;color:#8d8da0}
.rp-c .rp-term .rp-p{color:#5ce39b}
.rp-c .rp-term input{flex:1;background:none;border:0;color:#fff;font:inherit;outline:none}
.rp-c .rp-term input::placeholder{color:#565668}
.rp-c .rp-term button{border:0;border-radius:7px;background:var(--acc);color:#fff;font:600 13px/1 inherit;
   padding:10px 16px;cursor:pointer;font-family:ui-sans-serif,system-ui,sans-serif}
.rp-c .rp-facts{display:flex;gap:34px;margin-top:26px;font-size:13px;color:var(--dim)}
.rp-c .rp-facts b{display:block;font-size:22px;color:var(--ink);font-weight:600;letter-spacing:-.02em}

.rp-c .rp-lib{display:grid;grid-template-columns:minmax(0,1fr) 336px;align-items:start;padding-bottom:120px}
.rp-c .rp-libhead{grid-column:1/-1;display:flex;align-items:baseline;justify-content:space-between;
   padding:34px 40px 14px}
.rp-c .rp-libhead h2{margin:0;font-size:15px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim)}
.rp-c .rp-libhead .rp-filters{display:flex;gap:6px}
.rp-c .rp-filters button{border:1px solid var(--line);background:#fff;border-radius:7px;padding:6px 12px;
   font:inherit;font-size:12.5px;cursor:pointer;color:var(--dim)}
.rp-c .rp-filters button.rp-on{background:var(--ink);color:#fff;border-color:var(--ink)}
.rp-c table{width:100%;border-collapse:collapse;font-size:14px}
.rp-c thead th{position:sticky;top:0;background:#f7f7f9;text-align:left;font-weight:500;font-size:11px;
   letter-spacing:.14em;text-transform:uppercase;color:var(--dim);padding:10px 12px;
   border-bottom:1px solid var(--line)}
.rp-c thead th:first-child{padding-left:40px}
.rp-c tbody td{padding:13px 12px;border-bottom:1px solid var(--line);vertical-align:middle}
.rp-c tbody td:first-child{padding-left:40px}
.rp-c tbody tr{cursor:pointer}
.rp-c tbody tr:hover{background:#fff}
.rp-c tbody tr.rp-on{background:#fff;box-shadow:inset 3px 0 0 var(--acc)}
.rp-c td.rp-n{font:500 12px/1 ui-monospace,monospace;color:#b3b3c0}
.rp-c td.rp-t b{display:block;font-weight:600;letter-spacing:-.01em}
.rp-c td.rp-t span{display:block;font-size:12.5px;color:var(--dim);max-width:46ch}
.rp-c td.rp-mono{font-family:ui-monospace,monospace;font-size:13px;color:var(--dim)}
.rp-c .rp-bar{display:block;width:58px;height:5px;border-radius:3px;background:var(--line);overflow:hidden}
.rp-c .rp-bar i{display:block;height:100%;background:var(--acc)}
.rp-c td.rp-pick button{border:1px solid var(--line);background:#fff;border-radius:7px;padding:6px 12px;
   font:inherit;font-size:12.5px;cursor:pointer}
.rp-c td.rp-pick button:hover{border-color:var(--acc);color:var(--acc)}

.rp-c .rp-preview{position:sticky;top:14px;margin:0 40px 0 22px;padding:14px;background:#fff;
   border:1px solid var(--line);border-radius:14px}
.rp-c .rp-preview .rp-shot{aspect-ratio:9/16;border-radius:10px}
.rp-c .rp-preview .rp-ph{position:absolute;left:10px;top:10px;z-index:3;font-size:9px;letter-spacing:.2em;
   text-transform:uppercase;color:rgba(255,255,255,.7)}
.rp-c .rp-preview h3{margin:14px 0 6px;font-size:17px;font-weight:600;letter-spacing:-.02em}
.rp-c .rp-preview p{margin:0 0 14px;font-size:13.5px;color:var(--dim)}
.rp-c .rp-preview dl{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:0 0 16px;font-size:13px}
.rp-c .rp-preview dt{color:var(--dim)}
.rp-c .rp-preview dd{margin:0;font-family:ui-monospace,monospace}
.rp-c .rp-preview .rp-go{width:100%;border:0;border-radius:9px;background:var(--acc);color:#fff;
   font:600 14px/1 inherit;padding:13px;cursor:pointer}
`;

export default function VariantC() {
  const [active, setActive] = useState(0);
  const [tag, setTag] = useState<string>('All');
  const rows = TEMPLATES.filter((t) => tag === 'All' || t.tag === tag);
  const sel = rows[Math.min(active, rows.length - 1)] ?? TEMPLATES[0];

  return (
    <div className="rp-c">
      <style>{CSS}</style>

      <header className="rp-top">
        <span className="rp-brand">roastr<span>/</span>cli</span>
        <nav><a>Templates</a><a>How it reads your repo</a><a>Pricing</a><a>Log in</a></nav>
      </header>

      <section className="rp-intake"><div className="rp-wrap">
        <h1>Sixteen ways to be <u>publicly humbled</u> by your own repo.</h1>
        <p className="rp-lede">
          Point it at a public repo or product URL. It reads the issues, the commits, the changelog
          and what the internet said — then shows you every receipt before it renders a frame.
        </p>
        <div className="rp-term">
          <div className="rp-ln">
            <span className="rp-p">$</span>
            <input name="repo" placeholder="roastr https://github.com/you/your-repo" aria-label="Repository URL" />
            <button>Run</button>
          </div>
          <div className="rp-ln"><span>→</span><span>reads: issues · commits · README · changelog · public discussion</span></div>
        </div>
        <div className="rp-facts">
          <div><b>{TEMPLATES.length}</b>sample formats</div>
          <div><b>0</b>frames rendered before you approve</div>
          <div><b>100%</b>claims linked to a source</div>
        </div>
      </div></section>

      <section className="rp-lib">
        <div className="rp-libhead">
          <h2>Sample library</h2>
          <div className="rp-filters">
            {TAGS.map((t) => (
              <button key={t} className={t === tag ? 'rp-on' : ''} onClick={() => { setTag(t); setActive(0); }}>{t}</button>
            ))}
          </div>
        </div>

        <div>
          <table>
            <thead><tr>
              <th>#</th><th>Template</th><th>Format</th><th>Tone</th>
              <th>Ratio</th><th>Len</th><th>Heat</th><th />
            </tr></thead>
            <tbody>
              {rows.map((t, i) => (
                <tr key={t.id} className={sel.id === t.id ? 'rp-on' : ''} onMouseEnter={() => setActive(i)}>
                  <td className="rp-n">{String(i + 1).padStart(2, '0')}</td>
                  <td className="rp-t"><b>{t.title}</b><span>{t.hook}</span></td>
                  <td>{t.format}</td>
                  <td>{t.tone}</td>
                  <td className="rp-mono">{t.ratio}</td>
                  <td className="rp-mono">{t.dur}</td>
                  <td><span className="rp-bar"><i style={{ width: `${t.heat}%` }} /></span></td>
                  <td className="rp-pick"><button>use →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rp-preview">
          <div className="rp-shot rp-ph-sheen" style={posterStyle(sel)}>
            <span className="rp-ph">placeholder render</span>
          </div>
          <h3>{sel.title}</h3>
          <p>{sel.hook}</p>
          <dl>
            <dt>Format</dt><dd>{sel.format}</dd>
            <dt>Ratio</dt><dd>{sel.ratio}</dd>
            <dt>Length</dt><dd>{sel.dur}</dd>
            <dt>Tone</dt><dd>{sel.tone}</dd>
          </dl>
          <button className="rp-go">Use {sel.title} →</button>
        </div>
      </section>
    </div>
  );
}
