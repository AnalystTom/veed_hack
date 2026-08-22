# Fal + VEED API starter

This is a server-side Node.js starter for Fal image generation and VEED video APIs. Image generation defaults to `fal-ai/flux/schnell` at 512×512, one image, and one inference step to minimize cost.

## Set up the key

1. Create a Fal API key at <https://fal.ai/dashboard/keys>.
2. Run `cp .env.example .env`.
3. Put the key in `FAL_KEY` inside `.env`. Never commit this file.
4. Install dependencies with `npm install`.

VEED Fabric and Lip Sync are hosted and billed by Fal, so they use the same `FAL_KEY`; no VEED account or separate VEED credential is needed.

## Run examples

```sh
npm run fal:image -- "A cinematic product launch scene"
npm run veed:fabric -- https://example.com/character.png https://example.com/voice.mp3 720p
npm run veed:lipsync -- https://example.com/source.mp4 https://example.com/replacement.mp3
```

These commands make billable API calls. The default Fal image request is billed at the model's lowest listed rate of $0.003 per megapixel, rounded up to one megapixel. The media URLs must be publicly accessible HTTPS URLs.

## Verify locally

```sh
npm run check
npm test
```
