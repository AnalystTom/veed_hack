'use client';

import { useState } from 'react';
import { TEMPLATES, TAGS } from '../templates';
import { posterStyle, SHEEN_CSS } from '../shared';

// D — Wall. Volume as the pitch. The headline sits on a live mosaic of every
// sample at once, tiles sized by heat, so "there are loads of these" is the
// first thing you feel. Filters and the repo input float over the wall.


const CSS = `
${SHEEN_CSS}
.rp-d{background:#0a0a0f;color:#fff;min-height:100vh;
   font:400 16px/1.45 ui-sans-serif,-apple-system,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.rp-d .rp-stage{position:relative;padding:0 0 120px}
.rp-d .rp-overlay{position:sticky;top:0;z-index:40;padding:26px 34px 20px;
   background:linear-gradient(180deg,#0a0a0f 58%,rgba(10,10,15,0))}
.rp-d .rp-bar{display:flex;align-items:center;justify-content:space-between;gap:20px}
.rp-d .rp-brand{font-size:23px;font-weight:700;letter-spacing:-.03em}
.rp-d .rp-brand i{font-style:normal;color:#ff4d3d}
.rp-d .rp-find{flex:1;max-width:520px;display:flex;gap:8px;padding:7px 7px 7px 18px;border-radius:12px;
   background:#15151d;border:1px solid #24242e}
.rp-d .rp-find input{flex:1;background:none;border:0;color:#fff;font:inherit;font-size:14.5px;outline:none}
.rp-d .rp-find input::placeholder{color:#63636f}
.rp-d .rp-find button{border:0;border-radius:8px;background:#ff4d3d;color:#fff;font:650 13.5px/1 inherit;
   padding:12px 18px;cursor:pointer}
.rp-d .rp-login{font-size:14px;color:#8b8b98}

.rp-d .rp-banner{position:relative;z-index:30;padding:44px 34px 30px;display:grid;
   grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:30px}
.rp-d h1{margin:0;font-size:clamp(38px,7vw,92px);font-weight:800;line-height:.92;letter-spacing:-.045em;
   text-wrap:balance}
.rp-d h1 em{font-style:italic;color:#ff4d3d}
.rp-d .rp-banner p{margin:16px 0 0;font-size:18px;color:#9b9baa;max-width:48ch}
.rp-d .rp-chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.rp-d .rp-chips button{border:1px solid #2a2a36;background:#13131b;color:#a9a9b8;border-radius:999px;
   padding:9px 17px;font:inherit;font-size:13px;cursor:pointer}
.rp-d .rp-chips button.rp-on{background:#fff;color:#000;border-color:#fff;font-weight:600}

.rp-d .rp-wall{padding:14px 34px 0;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));
   grid-auto-rows:150px;gap:12px}
.rp-d .rp-tile{margin:0;position:relative;border-radius:16px;overflow:hidden;grid-row:span 2;
   border:1px solid #1c1c25;cursor:pointer;animation:d-in .5s var(--d) both}
@keyframes d-in{from{opacity:0;transform:translateY(14px)}}
.rp-d .rp-tile.rp-big{grid-row:span 3}
.rp-d .rp-tile.rp-wide{grid-column:span 2;grid-row:span 2}
.rp-d .rp-art{position:absolute;inset:0}
.rp-d .rp-ph{position:absolute;left:12px;top:12px;z-index:3;font-size:8.5px;letter-spacing:.22em;
   text-transform:uppercase;color:rgba(255,255,255,.6)}
.rp-d figcaption{position:absolute;inset:auto 0 0;z-index:4;padding:16px 15px 15px;display:grid;gap:6px;
   background:linear-gradient(180deg,transparent,rgba(6,6,10,.82) 34%,rgba(6,6,10,.97))}
.rp-d .rp-rank{font:600 10.5px/1 ui-monospace,monospace;letter-spacing:.14em;color:#ff8a7d}
.rp-d figcaption b{font-size:16.5px;font-weight:650;letter-spacing:-.02em}
.rp-d .rp-hook{font-size:12.5px;color:#a9a9b8;max-height:0;opacity:0;overflow:hidden;transition:.24s}
.rp-d .rp-foot{display:flex;align-items:baseline;justify-content:space-between;gap:10px;
   font-size:11px;color:#7b7b8a;white-space:nowrap;overflow:hidden}
.rp-d .rp-foot em{font-style:normal;overflow:hidden;text-overflow:ellipsis}
.rp-d .rp-foot i{font-style:normal;color:#ff4d3d;white-space:nowrap}
.rp-d figcaption button{margin-top:4px;max-height:0;opacity:0;padding:0;border:0;overflow:hidden;
   border-radius:8px;background:#fff;color:#000;font:650 12.5px/1 inherit;cursor:pointer;transition:.24s}
.rp-d .rp-tile:hover{border-color:#3a3a4a}
.rp-d .rp-tile:hover .rp-hook{max-height:60px;opacity:1}
.rp-d .rp-tile:hover figcaption button{max-height:40px;opacity:1;padding:10px}

.rp-d .rp-more{margin:34px auto 0;display:block;border:1px solid #2a2a36;background:#13131b;color:#d6d6e2;
   border-radius:999px;padding:14px 30px;font:inherit;font-size:14px;cursor:pointer}
`;

export default function VariantD() {
  const [tag, setTag] = useState<string>('All');
  const shown = TEMPLATES.filter((t) => tag === 'All' || t.tag === tag);

  return (
    <div className="rp-d"><div className="rp-stage">
      <style>{CSS}</style>

      <div className="rp-overlay"><div className="rp-bar">
        <span className="rp-brand">ROAST<i>R</i></span>
        <div className="rp-find">
          <input name="repo" placeholder="Drop a repo or product URL" aria-label="Repository URL" />
          <button>Roast it</button>
        </div>
        <span className="rp-login">Log in</span>
      </div></div>

      <div className="rp-banner">
        <div>
          <h1>{TEMPLATES.length} ways to get<br /><em>absolutely cooked</em>.</h1>
          <p>
            Every template below is a real format, researched from your repo&apos;s own issues,
            commits and comment sections. Pick one, approve the script, render.
          </p>
        </div>
        <div className="rp-chips">
          {TAGS.map((t) => (
            <button key={t} className={t === tag ? 'rp-on' : ''} onClick={() => setTag(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="rp-wall">
        {shown.map((t, i) => (
          <figure
            key={t.id}
            className={`tile${t.heat >= 86 ? ' rp-big' : ''}${t.ratio === '16:9' ? ' wide' : ''}`}
            style={{ '--d': `${(i % 7) * 0.35}s` } as React.CSSProperties}
          >
            <div className="rp-art rp-ph-sheen" style={posterStyle(t)}><span className="rp-ph">placeholder</span></div>
            <figcaption>
              <span className="rp-rank">#{i + 1}</span>
              <b>{t.title}</b>
              <span className="rp-hook">{t.hook}</span>
              <span className="rp-foot"><em>{t.format} · {t.dur}</em><i>{t.heat}° heat</i></span>
              <button>Use template</button>
            </figcaption>
          </figure>
        ))}
      </div>

      <button className="rp-more">Show all formats</button>
    </div></div>
  );
}
