'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// PROTOTYPE — floating variant switcher. Never ships: it is gated on
// NODE_ENV so a stray merge can't put it in front of a real user.

const CSS = `
#proto-switcher{position:fixed;z-index:9999;left:50%;bottom:22px;transform:translateX(-50%);
  display:flex;align-items:center;gap:4px;padding:6px;border-radius:999px;
  background:#fff;color:#000;box-shadow:0 10px 40px rgba(0,0,0,.45),0 0 0 1px rgba(0,0,0,.9);
  font:500 13px/1 ui-sans-serif,system-ui,sans-serif}
#proto-switcher button{width:32px;height:32px;border:0;border-radius:999px;background:#111;color:#fff;
  cursor:pointer;font-size:15px}
#proto-switcher button:hover{background:#6b57ff}
#proto-switcher span{padding:0 14px;display:flex;flex-direction:column;gap:4px;white-space:nowrap}
#proto-switcher em{font-style:normal;font-size:10px;letter-spacing:.14em;text-transform:uppercase;opacity:.45}
`;

export default function PrototypeSwitcher({
  variants,
  current,
}: {
  variants: { key: string; name: string }[];
  current: string;
}) {
  const router = useRouter();
  const i = Math.max(0, variants.findIndex((v) => v.key === current));
  const go = (next: number) =>
    router.replace(`/prototype/landing?variant=${variants[(next + variants.length) % variants.length].key}`);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.matches('input,textarea') || el.isContentEditable)) return;
      if (e.key === 'ArrowLeft') go(i - 1);
      if (e.key === 'ArrowRight') go(i + 1);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div id="proto-switcher">
      <style>{CSS}</style>
      <button onClick={() => go(i - 1)} aria-label="Previous variant">←</button>
      <span>
        <span><b>{variants[i].key}</b> — {variants[i].name}</span>
        <em>prototype {i + 1}/{variants.length}</em>
      </span>
      <button onClick={() => go(i + 1)} aria-label="Next variant">→</button>
    </div>
  );
}
