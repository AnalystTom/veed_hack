'use client';

import { useEffect, useRef, useState } from 'react';
import { TEMPLATES } from './templates';
import { posterStyle, SHEEN_CSS } from './shared';

// The reviewer is a Reels/TikTok surface: one full-height vertical video per
// snap point, caption anchored at the floor of the frame, action rail beside
// it, and the rest of the library one flick away. It opens over the landing
// page when someone actually picks a template.
//
// Classes are `rpv-` prefixed, NOT `rp-`: this mounts inside a variant's root,
// so sharing that variant's class names lets its rules win on source order.

const CSS = `
${SHEEN_CSS}
.rpv-rv{position:fixed;inset:0;z-index:200;background:#050508;color:#fff;
   font:400 16px/1.45 ui-sans-serif,-apple-system,system-ui,sans-serif;-webkit-font-smoothing:antialiased;
   animation:rv-in .22s ease-out both}
@keyframes rv-in{from{opacity:0;transform:scale(.985)}}
.rpv-rv .rpv-feed{height:100%;overflow-y:auto;scroll-snap-type:y mandatory;scrollbar-width:none}
.rpv-rv .rpv-feed::-webkit-scrollbar{display:none}
.rpv-rv .rpv-slide{position:relative;height:100%;scroll-snap-align:start;overflow:hidden}

/* Ambient fill behind the portrait card, the way the phone apps letterbox. */
.rpv-rv .rpv-blur{position:absolute;inset:-10%;z-index:0;filter:blur(70px) saturate(.6) brightness(.4)}
.rpv-rv .rpv-slide::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;
   background:rgba(4,4,8,.45)}

.rpv-rv .rpv-stage{position:relative;z-index:2;height:100%;display:flex;align-items:center;
   justify-content:center;gap:16px}
/* Sized off the viewport, not off a percentage chain — a percentage height here
   resolves against the padding box and the card overflows the fold. */
.rpv-rv .rpv-frame{position:relative;height:calc(100dvh - 96px);aspect-ratio:9/16;
   max-width:min(90vw,470px);border-radius:20px;overflow:hidden;background:#000;
   box-shadow:0 34px 100px rgba(0,0,0,.66)}
.rpv-rv .rpv-canvas{position:absolute;inset:0;z-index:0}
.rpv-rv .rpv-ph{position:absolute;left:16px;top:15px;z-index:4;font-size:9.5px;letter-spacing:.24em;
   text-transform:uppercase;color:rgba(255,255,255,.62)}

/* Caption sits at the floor of the frame, Reels-style. */
.rpv-rv .rpv-caption{position:absolute;z-index:3;left:0;right:0;bottom:0;padding:70px 20px 20px;
   background:linear-gradient(180deg,transparent,rgba(0,0,0,.55) 42%,rgba(0,0,0,.88))}
.rpv-rv .rpv-handle{display:block;margin-bottom:8px;font:600 13.5px/1 ui-monospace,monospace;color:#dcdce6}
.rpv-rv .rpv-caption h2{margin:0 0 6px;font-size:26px;font-weight:650;line-height:1.1;letter-spacing:-.025em}
.rpv-rv .rpv-caption p{margin:0 0 12px;font-size:14.5px;line-height:1.35;color:#cfcfda}
.rpv-rv .rpv-specs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}
.rpv-rv .rpv-specs span{padding:4px 9px;border-radius:6px;background:rgba(255,255,255,.13);font-size:11.5px;
   color:#e4e4ee;backdrop-filter:blur(6px)}
.rpv-rv .rpv-use{border:0;border-radius:11px;background:#6b57ff;color:#fff;font:650 14px/1 inherit;
   padding:13px 22px;cursor:pointer;transition:.18s}
.rpv-rv .rpv-use:hover{background:#7f6dff;transform:translateY(-1px)}

/* Action rail: bottom-aligned beside the card on desktop, over it on phones. */
.rpv-rv .rpv-rail{position:relative;z-index:3;height:calc(100dvh - 96px);display:flex;
   flex-direction:column;justify-content:flex-end;gap:16px;padding-bottom:6px}
.rpv-rv .rpv-actwrap{display:grid;justify-items:center;gap:5px}
.rpv-rv .rpv-act{width:52px;height:52px;border-radius:999px;border:0;background:rgba(255,255,255,.12);
   color:#fff;font:400 21px/1 inherit;display:grid;place-items:center;cursor:pointer;
   backdrop-filter:blur(12px);transition:.16s}
.rpv-rv .rpv-act:hover{background:rgba(255,255,255,.24);transform:scale(1.06)}
.rpv-rv .rpv-act.rpv-on{background:#ff2d55}
.rpv-rv .rpv-actwrap em{font-style:normal;font-size:11px;letter-spacing:.02em;color:#d3d3de}

.rpv-rv .rpv-step{display:flex;flex-direction:column;gap:10px;margin-top:2px;padding-top:16px;
   border-top:1px solid rgba(255,255,255,.14)}
.rpv-rv .rpv-step button{width:52px;height:38px;border-radius:12px;border:1px solid rgba(255,255,255,.18);
   background:rgba(255,255,255,.06);color:#fff;font-size:15px;cursor:pointer;backdrop-filter:blur(10px)}
.rpv-rv .rpv-step button:hover:not(:disabled){background:rgba(255,255,255,.2)}
.rpv-rv .rpv-step button:disabled{opacity:.22;cursor:default}

.rpv-rv .rpv-bar{position:absolute;z-index:20;left:0;right:0;top:0;display:flex;align-items:center;
   justify-content:space-between;padding:20px 26px;pointer-events:none;
   background:linear-gradient(180deg,rgba(5,5,9,.8),transparent)}
.rpv-rv .rpv-bar > *{pointer-events:auto}
.rpv-rv .rpv-count{font:600 12px/1 ui-monospace,monospace;letter-spacing:.14em;color:#9a9aab}
.rpv-rv .rpv-close{display:flex;align-items:center;gap:9px;border:1px solid rgba(255,255,255,.2);
   border-radius:999px;background:rgba(10,10,16,.6);color:#e6e6ee;font:inherit;font-size:13px;
   padding:9px 17px;cursor:pointer;backdrop-filter:blur(10px)}
.rpv-rv .rpv-close:hover{background:rgba(255,255,255,.12)}

@media (max-width:860px){
  .rpv-rv .rpv-stage{padding:0;gap:0}
  .rpv-rv .rpv-frame{height:100%;width:100%;max-width:none;aspect-ratio:auto;border-radius:0;
     box-shadow:none}
  .rpv-rv .rpv-rail{height:auto}
  .rpv-rv .rpv-rail{position:absolute;right:10px;bottom:112px;padding-bottom:0}
  .rpv-rv .rpv-caption{padding:70px 84px 26px 18px}
  .rpv-rv .rpv-ph{top:56px}
  .rpv-rv .rpv-step{display:none}
}
`;

export default function ReviewerOverlay({
  startIndex,
  onClose,
}: {
  startIndex: number;
  onClose: () => void;
}) {
  const feed = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(startIndex);
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  // Jump to the clicked item without animating through everything before it.
  useEffect(() => {
    const el = feed.current;
    if (el) el.scrollTop = startIndex * el.clientHeight;
  }, [startIndex]);

  // Body scroll lock, so the page underneath doesn't move while reviewing.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const step = (delta: number) => {
    const el = feed.current;
    if (!el) return;
    const next = Math.min(TEMPLATES.length - 1, Math.max(0, i + delta));
    el.scrollTo({ top: next * el.clientHeight, behavior: 'smooth' });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  const t = TEMPLATES[i];

  return (
    <div className="rpv-rv" role="dialog" aria-modal="true" aria-label={`Reviewing ${t.title}`}>
      <style>{CSS}</style>

      <div
        className="rpv-feed"
        ref={feed}
        onScroll={(e) => {
          const el = e.currentTarget;
          const next = Math.round(el.scrollTop / el.clientHeight);
          if (next !== i) setI(next);
        }}
      >
        {TEMPLATES.map((item) => {
          const on = !!liked[item.id];
          return (
            <article className="rpv-slide" key={item.id}>
              <div className="rpv-blur" style={posterStyle(item)} aria-hidden />
              <div className="rpv-stage">
                <div className="rpv-frame">
                  <div className="rpv-canvas rp-ph-sheen" style={posterStyle(item)} />
                  <span className="rpv-ph">placeholder render</span>

                  <div className="rpv-caption">
                    {/* Placeholder handle — these are not real repositories. */}
                    <span className="rpv-handle">@example/{item.id}</span>
                    <h2>{item.title}</h2>
                    <p>{item.hook}</p>
                    <div className="rpv-specs">
                      <span>{item.tag}</span><span>{item.format}</span>
                      <span>{item.ratio}</span><span>{item.dur}</span><span>{item.tone}</span>
                    </div>
                    <button className="rpv-use">Use this template →</button>
                  </div>
                </div>

                <aside className="rpv-rail">
                  <div className="rpv-actwrap">
                    <button
                      className={on ? 'rpv-act rpv-on' : 'rpv-act'}
                      aria-pressed={on}
                      aria-label={on ? 'Unlike' : 'Like'}
                      onClick={() => setLiked((p) => ({ ...p, [item.id]: !p[item.id] }))}
                    >♥</button>
                    <em>{item.heat + (on ? 1 : 0)}</em>
                  </div>
                  <div className="rpv-actwrap">
                    <button className="rpv-act" aria-label="Share">↗</button>
                    <em>Share</em>
                  </div>
                  <div className="rpv-actwrap">
                    <button className="rpv-act" aria-label="View the repo">{'</>'}</button>
                    <em>Repo</em>
                  </div>
                  <div className="rpv-actwrap">
                    <button className="rpv-act" aria-label="Remix">↺</button>
                    <em>Remix</em>
                  </div>
                  <div className="rpv-step">
                    <button onClick={() => step(-1)} disabled={i === 0} aria-label="Previous roast">↑</button>
                    <button onClick={() => step(1)} disabled={i === TEMPLATES.length - 1} aria-label="Next roast">↓</button>
                  </div>
                </aside>
              </div>
            </article>
          );
        })}
      </div>

      <div className="rpv-bar">
        <span className="rpv-count">{String(i + 1).padStart(2, '0')} / {TEMPLATES.length}</span>
        <button className="rpv-close" onClick={onClose}>Close <span>esc</span></button>
      </div>
    </div>
  );
}
