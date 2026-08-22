// PROTOTYPE — floating variant switcher. Never ships.

export function mountSwitcher(variants, current) {
  const keys = variants.map((v) => v.key);
  const i = Math.max(0, keys.indexOf(current));

  const go = (next) => {
    const url = new URL(location.href);
    url.searchParams.set('variant', keys[(next + keys.length) % keys.length]);
    location.assign(url.toString());
  };

  const bar = document.createElement('div');
  bar.id = 'proto-switcher';
  bar.innerHTML = `
    <button data-dir="-1" aria-label="Previous variant">←</button>
    <span><b>${keys[i]}</b> — ${variants[i].name}<em>prototype ${i + 1}/${keys.length}</em></span>
    <button data-dir="1" aria-label="Next variant">→</button>`;
  bar.querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => go(i + Number(b.dataset.dir))));

  const css = document.createElement('style');
  css.textContent = `
    #proto-switcher{position:fixed;z-index:9999;left:50%;bottom:22px;transform:translateX(-50%);
      display:flex;align-items:center;gap:4px;padding:6px;border-radius:999px;
      background:#fff;color:#000;box-shadow:0 10px 40px rgba(0,0,0,.45),0 0 0 1px rgba(0,0,0,.9);
      font:500 13px/1 ui-sans-serif,system-ui,sans-serif}
    #proto-switcher button{width:32px;height:32px;border:0;border-radius:999px;background:#111;color:#fff;
      cursor:pointer;font-size:15px}
    #proto-switcher button:hover{background:#6b57ff}
    #proto-switcher span{padding:0 14px;display:flex;flex-direction:column;gap:4px;white-space:nowrap}
    #proto-switcher em{font-style:normal;font-size:10px;letter-spacing:.14em;text-transform:uppercase;opacity:.45}`;

  document.body.append(css, bar);

  addEventListener('keydown', (e) => {
    const el = document.activeElement;
    if (el && (el.matches('input,textarea') || el.isContentEditable)) return;
    if (e.key === 'ArrowLeft') go(i - 1);
    if (e.key === 'ArrowRight') go(i + 1);
  });
}
