// PROTOTYPE — shared placeholder plumbing only. No layout lives here.
import type { Template } from './templates';

// There are no real roast videos yet. Every "video" in this prototype is a
// CSS placeholder: a two-stop gradient poster with a drifting sheen so the
// eye reads it as motion. Labelled PLACEHOLDER everywhere it appears.
export function posterStyle(t: Template): React.CSSProperties {
  return {
    background: `radial-gradient(120% 90% at 22% 12%, ${t.g[0]}cc 0%, transparent 62%),
      radial-gradient(140% 110% at 82% 96%, ${t.g[1]} 0%, transparent 70%),
      linear-gradient(155deg, ${t.g[1]} 0%, #05050a 100%)`,
  };
}

// Every variant opts into `.ph-sheen` for the fake-motion pass.
export const SHEEN_CSS = `
.rp-ph-sheen{position:relative;overflow:hidden}
.rp-ph-sheen::after{content:"";position:absolute;inset:-40%;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.16) 48%,transparent 58%);animation:ph-sweep 5.5s linear infinite}
.rp-ph-sheen::before{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;opacity:.16;
  background-image:repeating-linear-gradient(0deg,rgba(0,0,0,.5) 0 1px,transparent 1px 3px)}
@keyframes ph-sweep{from{transform:translateX(-55%)}to{transform:translateX(55%)}}
@media (prefers-reduced-motion:reduce){.rp-ph-sheen::after{animation:none}}
`;
