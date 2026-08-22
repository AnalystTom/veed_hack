import { TEMPLATES } from '../templates';
import { posterStyle, SHEEN_CSS } from '../shared';

// B — Feed. The landing page IS the sample reel. No hero section at all: you
// land inside a full-bleed vertical snap feed of roasts, with a persistent
// repo-input dock. Answers "what do these actually look like?" in zero clicks.


const CSS = `
${SHEEN_CSS}
.rp-b{height:100vh;background:#08080c;color:#fff;
   font:400 16px/1.45 ui-sans-serif,-apple-system,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.rp-b .rp-feed{height:100vh;overflow-y:auto;scroll-snap-type:y mandatory;scrollbar-width:none}
.rp-b .rp-feed::-webkit-scrollbar{display:none}
.rp-b .rp-slide{position:relative;height:100vh;scroll-snap-align:start;display:grid;
   grid-template-columns:1fr minmax(300px,420px) 92px;align-items:center;padding:0 44px;overflow:hidden}
.rp-b .rp-canvas{position:absolute;inset:0;z-index:0}
.rp-b .rp-slide::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;
   background:linear-gradient(90deg,rgba(0,0,0,.15) 0%,rgba(4,4,8,.9) 46%,rgba(4,4,8,.96) 100%)}
.rp-b .rp-ph{position:absolute;left:26px;top:26px;z-index:3;font-size:9.5px;letter-spacing:.24em;
   text-transform:uppercase;color:rgba(255,255,255,.65)}
.rp-b .rp-idx{position:absolute;left:26px;bottom:26px;z-index:3;font:600 12px/1 ui-monospace,monospace;
   letter-spacing:.1em;color:rgba(255,255,255,.6)}
.rp-b .rp-copy{position:relative;z-index:2;grid-column:2}
.rp-b .rp-chip{display:inline-block;margin-bottom:18px;padding:6px 13px;border-radius:999px;
   border:1px solid rgba(255,255,255,.22);font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;
   color:#d6d6e0}
.rp-b .rp-copy h2{margin:0 0 14px;font-size:clamp(34px,4.6vw,58px);font-weight:600;line-height:1;
   letter-spacing:-.03em}
.rp-b .rp-copy p{margin:0 0 24px;font-size:19px;line-height:1.35;color:#b9b9c6;max-width:34ch}
.rp-b .rp-specs{display:flex;gap:8px}
.rp-b .rp-specs span{padding:5px 11px;border-radius:7px;background:rgba(255,255,255,.07);font-size:12px;
   color:#cfcfda}
.rp-b .rp-rail{position:relative;z-index:2;grid-column:3;display:flex;flex-direction:column;gap:14px;
   text-align:center}
.rp-b .rp-act{border:0;border-radius:14px;background:rgba(255,255,255,.09);color:#fff;padding:12px 0;
   cursor:pointer;display:grid;gap:3px;backdrop-filter:blur(8px);transition:.18s;font:inherit}
.rp-b .rp-act:hover{background:rgba(255,255,255,.18)}
.rp-b .rp-act b{font-size:17px}
.rp-b .rp-act span{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#c6c6d2}
.rp-b .rp-act.rp-use{background:#6b57ff;font-weight:650;font-size:12px;padding:14px 6px;line-height:1.2}
.rp-b .rp-act.rp-use:hover{background:#7f6dff}

.rp-b .rp-dock{position:fixed;z-index:60;left:44px;top:34px;right:44px;display:flex;align-items:center;
   justify-content:space-between;gap:24px;pointer-events:none}
.rp-b .rp-dock > *{pointer-events:auto}
.rp-b .rp-brand{font-size:24px;font-weight:650;letter-spacing:-.02em}
.rp-b .rp-input{flex:1;max-width:560px;display:flex;align-items:center;gap:10px;padding:8px 8px 8px 20px;
   border-radius:999px;background:rgba(14,14,20,.72);border:1px solid rgba(255,255,255,.14);
   backdrop-filter:blur(14px)}
.rp-b .rp-input input{flex:1;background:none;border:0;color:#fff;font:inherit;font-size:15px;outline:none}
.rp-b .rp-input input::placeholder{color:#7c7c8c}
.rp-b .rp-input button{border:0;border-radius:999px;background:#fff;color:#000;font:650 14px/1 inherit;
   padding:12px 22px;cursor:pointer}
.rp-b .rp-hint{font-size:12px;color:#7c7c8c;letter-spacing:.04em}
.rp-b .rp-cue{position:fixed;z-index:60;right:44px;bottom:104px;font-size:11px;letter-spacing:.24em;
   text-transform:uppercase;color:#6d6d7c;writing-mode:vertical-rl}
`;

export default function VariantB() {
  return (
    <div className="rp-b">
      <style>{CSS}</style>

      <div className="rp-dock">
        <span className="rp-brand">Roastr</span>
        <div className="rp-input">
          <input name="repo" placeholder="github.com/you/your-repo" aria-label="Repository URL" />
          <button>Roast it</button>
        </div>
        <span className="rp-hint">Scroll · {TEMPLATES.length} sample roasts</span>
      </div>

      <div className="rp-feed">
        {TEMPLATES.map((t, i) => (
          <article className="rp-slide" key={t.id}>
            <div className="rp-canvas rp-ph-sheen" style={posterStyle(t)}>
              <span className="rp-ph">placeholder render</span>
              <span className="rp-idx">{String(i + 1).padStart(2, '0')} / {TEMPLATES.length}</span>
            </div>
            <div className="rp-copy">
              <span className="rp-chip">{t.tag} · {t.format}</span>
              <h2>{t.title}</h2>
              <p>{t.hook}</p>
              <div className="rp-specs"><span>{t.ratio}</span><span>{t.dur}</span><span>{t.tone}</span></div>
            </div>
            <aside className="rp-rail">
              <button className="rp-act"><b>▶</b><span>Play</span></button>
              <button className="rp-act"><b>{t.heat}</b><span>heat</span></button>
              <button className="rp-act"><b>↺</b><span>Remix</span></button>
              <button className="rp-act rp-use">Use this</button>
            </aside>
          </article>
        ))}
      </div>

      <span className="rp-cue">keep scrolling</span>
    </div>
  );
}
