// app/globals.css carries unscoped element rules (`body`, `h1 em`, …) owned by
// other work in this app. Every landing class is `rp-`/`rpv-`-prefixed so it
// cannot collide; this block undoes the bare-element inheritance that prefixing
// alone cannot reach. Shared by the prototype route and by `/`.
export const ISOLATE = `
html,body{background:#000;color:#f5f5f7;font-family:ui-sans-serif,-apple-system,system-ui,sans-serif}
/* Attribute form, not #id: one class-worth of specificity — enough to outrank
   the bare-element globals, low enough that each variant's own rules still win. */
[id=rp-root] h1,[id=rp-root] h2,[id=rp-root] h3,[id=rp-root] p{margin:0;font-family:inherit;
  letter-spacing:normal;font-weight:400;line-height:normal;color:inherit}
[id=rp-root] em,[id=rp-root] i,[id=rp-root] b{font-family:inherit;color:inherit;font-weight:inherit;
  font-style:normal}
`;
