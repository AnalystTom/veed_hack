# PROTOTYPE — roast landing page variants

**Question:** how should the sample "roast" video templates be presented on the
landing page — as a cinematic teaser, as the page itself, as a developer-tool
catalogue, or as a wall of volume?

**Shape:** four radically different landing pages on one throwaway route,
switchable via `?variant=` and the floating bottom bar (arrow keys work too).

```sh
cd web && npm run dev
# http://localhost:3000/prototype/landing?variant=A
```

| Variant | Idea | The bet |
| --- | --- | --- |
| **A — Premiere** | Full-bleed cinematic hero (closest to the `x.getstanley.ai/welcome` reference), one promise, one CTA. Templates live *below* the fold as a scrubbable filmstrip. | Attitude sells before catalogue does. |
| **B — Feed** | No hero at all. You land inside a full-bleed vertical snap reel — one roast per screen, with a persistent repo-input dock. | Seeing the output *is* the pitch. |
| **C — Ledger** | Anti-cinematic. Light, monospaced developer tool: terminal intake, then the sample library as a dense table with a sticky preview pane. | The audience is the people being roasted; they trust receipts more than spectacle. |
| **D — Wall** | Heat-ranked mosaic of every sample at once, headline overlaid, filter chips floating over the wall. | Volume is the product — "there are loads of these" should be the first feeling. |

## Rules this prototype follows

- **No invented media.** There are no real roast videos yet, so every "video" is
  a CSS gradient poster with a drifting sheen, labelled `PLACEHOLDER` on the tile.
  The template list in `templates.ts` is prototype data and must not be promoted.
- **No backend.** Inputs and buttons are inert; nothing calls fal.ai, Tavily or OpenAI.
- **Throwaway.** The switcher is gated on `NODE_ENV !== 'production'`. When a
  variant wins, rewrite it properly as the real landing page and move the rest
  onto a throwaway branch — don't promote this code as-is.

Context: issue #1 (*Spec: research-led parody video generator*).
