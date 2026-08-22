'use client';

import Link from 'next/link';
import { useState } from 'react';
import { TEMPLATES } from '../templates';
import { posterStyle, SHEEN_CSS } from '../shared';
import ReviewerOverlay from '../ReviewerOverlay';

// A — Premiere, the standard page. Cinematic hero (per the Stanley reference)
// over a NEUTRAL backdrop, so the colour in the filmstrip belongs to the videos
// rather than the wallpaper. Clicking any template hands off to the variant-B
// reel as a reviewer overlay.

const CSS = `
${SHEEN_CSS}
.rp-a{background:#000;color:#f5f5f7;font:400 16px/1.4 ui-sans-serif,-apple-system,system-ui,sans-serif;
   -webkit-font-smoothing:antialiased}
.rp-a nav{position:fixed;inset:0 0 auto;z-index:50;display:flex;align-items:center;justify-content:space-between;
   padding:22px 50px;mix-blend-mode:difference}
.rp-a nav b{font-size:27px;font-weight:600;letter-spacing:-.02em}
.rp-a nav .rp-lg{font-size:14px;color:#f5f5f7;opacity:.7;margin-right:18px}
.rp-a .rp-pill{display:inline-flex;align-items:center;gap:10px;border:1px solid #6b57ff;border-radius:40px;
   padding:15px 36px;font-weight:600;letter-spacing:-.02em;color:#fff;background:rgba(0,0,0,.2);
   box-shadow:0 0 0 1px rgba(107,87,255,.35),0 18px 48px rgba(0,0,0,.4);backdrop-filter:blur(3px);
   transition:.2s;cursor:pointer;font-size:16px;font-family:inherit}
.rp-a .rp-pill:hover{transform:translateY(-1px);background:rgba(107,87,255,.12);
   box-shadow:0 0 0 1px rgba(107,87,255,.65),0 18px 54px rgba(107,87,255,.22)}
.rp-a nav .rp-pill{padding:8px 22px;font-size:14px;border-color:rgba(255,255,255,.7);box-shadow:none}

/* Hero is content-sized, not viewport-sized: the whole point of the page is the
   templates, so they have to be visible without scrolling. */
.rp-a .rp-hero{position:relative;isolation:isolate;display:flex;flex-direction:column;
   align-items:center;justify-content:center;padding:96px 20px 22px;text-align:center;overflow:hidden}

/* Neutral backdrop: the same drifting mosaic, drained of hue. */
.rp-a .rp-bg{position:absolute;inset:-6%;z-index:0;display:grid;grid-template-columns:repeat(4,1fr);
   grid-template-rows:repeat(2,1fr);filter:grayscale(1) brightness(.5) contrast(1.02) blur(30px)}
.rp-a .rp-bg span{animation:a-breathe 11s ease-in-out infinite alternate}
.rp-a .rp-bg span:nth-child(2n){animation-delay:-3.5s}
.rp-a .rp-bg span:nth-child(3n){animation-delay:-6s}
@keyframes a-breathe{to{transform:scale(1.09)}}
.rp-a .rp-scrim{position:absolute;inset:0;z-index:1;background:rgba(6,6,8,.58)}
.rp-a .rp-scrim2{position:absolute;inset:0;z-index:2;background:linear-gradient(180deg,rgba(0,0,0,.62) 0%,
   rgba(0,0,0,.24) 34%,rgba(0,0,0,.62) 72%,#000 100%)}
.rp-a h1{position:relative;z-index:10;margin:0 0 12px;font-size:clamp(38px,6.6vw,76px);font-weight:500;
   line-height:.98;letter-spacing:-.03em}
.rp-a h1 em{font-weight:700;font-style:italic}
.rp-a p.rp-sub{position:relative;z-index:10;max-width:640px;margin:0 0 20px;font-size:clamp(16px,1.75vw,20px);
   line-height:1.3;color:#dcdce4}
.rp-a .rp-cta{position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;gap:10px}
.rp-a .rp-fine{font-size:12px;color:#8a8a96}

.rp-a .rp-strip{padding:22px 0 110px}
.rp-a .rp-strip header{display:flex;align-items:flex-end;justify-content:space-between;padding:0 50px 10px}
.rp-a .rp-strip h2{margin:0;font-size:clamp(24px,3.1vw,36px);font-weight:500;letter-spacing:-.025em}
.rp-a .rp-strip h2 em{font-style:italic;font-weight:700}
.rp-a .rp-strip .rp-count{font-size:13px;color:#7a7a86;letter-spacing:.12em;text-transform:uppercase}
.rp-a .rp-rail{display:flex;gap:14px;overflow-x:auto;padding:8px 50px 22px;scroll-snap-type:x mandatory;scroll-padding-left:50px;
   scrollbar-width:thin;scrollbar-color:#2a2a33 transparent}
.rp-a .rp-cell{flex:0 0 clamp(150px,15vw,208px);scroll-snap-align:start;background:none;border:0;padding:0;color:inherit;
   text-align:left;cursor:pointer;font:inherit}
.rp-a .rp-poster{display:block;aspect-ratio:9/16;border-radius:14px;border:1px solid rgba(255,255,255,.09);
   transition:.25s}
.rp-a .rp-cell:hover .rp-poster{transform:translateY(-6px) scale(1.015);border-color:rgba(255,255,255,.34)}
.rp-a .rp-ph{position:absolute;left:10px;bottom:10px;z-index:3;font-style:normal;font-size:9px;
   letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.62)}
.rp-a .rp-play{position:absolute;inset:0;z-index:3;display:grid;place-items:center;opacity:0;transition:.22s}
.rp-a .rp-play i{display:grid;place-items:center;width:52px;height:52px;border-radius:999px;font-style:normal;
   background:rgba(10,10,14,.55);border:1px solid rgba(255,255,255,.5);backdrop-filter:blur(6px);
   font-size:16px;padding-left:3px}
.rp-a .rp-cell:hover .rp-play{opacity:1}
.rp-a .rp-cell b{display:block;margin:10px 0 3px;font-size:15px;font-weight:600;letter-spacing:-.01em}
.rp-a .rp-cell .rp-meta{font-size:12.5px;color:#7a7a86}

@media (max-width:760px){
  .rp-a nav{padding:16px 20px}
  .rp-a .rp-hero{padding:72px 18px 16px}
  .rp-a h1{margin:0 0 10px;line-height:1.02}
  .rp-a p.rp-sub{margin:0 0 16px;font-size:15px}
  .rp-a .rp-pill{padding:13px 26px;font-size:15px}
  .rp-a .rp-strip{padding:18px 0 80px}
  .rp-a .rp-strip header{padding:0 20px 8px;gap:12px}
  .rp-a .rp-strip .rp-count{display:none}
  .rp-a .rp-rail{gap:10px;padding:6px 20px 18px;scroll-padding-left:20px}
}
`;

export default function VariantA() {
  const [reviewing, setReviewing] = useState<number | null>(null);

  return (
    <div className="rp-a">
      <style>{CSS}</style>

      <nav>
        <b>Roastr</b>
        <div>
          <a className="rp-lg">Log In</a>
          <Link className="rp-pill" href="/create">Start a roast</Link>
        </div>
      </nav>

      <section className="rp-hero">
        <div className="rp-bg" aria-hidden>
          {TEMPLATES.slice(0, 8).map((t) => <span key={t.id} style={posterStyle(t)} />)}
        </div>
        <div className="rp-scrim" /><div className="rp-scrim2" />
        <h1>Your project has <em>notes</em><br />for you.</h1>
        <p className="rp-sub">
          Paste a product website or public GitHub repository. We research the product,
          code and public conversation, then hand it all to someone with a microphone and no manners.
        </p>
        <div className="rp-cta">
          <Link className="rp-pill" href="/create">Start a roast <span>→</span></Link>
          <span className="rp-fine">Free preview · you approve the script before anything renders</span>
        </div>
      </section>

      <section className="rp-strip">
        <header>
          <h2>Previous <em>roasts:</em></h2>
          <span className="rp-count">scroll →</span>
        </header>
        <div className="rp-rail">
          {TEMPLATES.map((t, i) => (
            <button className="rp-cell" key={t.id} onClick={() => setReviewing(i)}>
              <span className="rp-poster rp-ph-sheen" style={posterStyle(t)}>
                <i className="rp-ph">placeholder</i>
                <span className="rp-play"><i>▶</i></span>
              </span>
              <b>{t.title}</b>
              <span className="rp-meta">{t.format} · {t.dur}</span>
            </button>
          ))}
        </div>
      </section>

      {reviewing !== null && (
        <ReviewerOverlay startIndex={reviewing} onClose={() => setReviewing(null)} />
      )}
    </div>
  );
}
