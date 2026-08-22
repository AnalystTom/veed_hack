# RoastBench — source-grounded tech roast videos

RoastBench turns a public GitHub repository into a reviewable evidence pack, public-perception research, and a batch of candidate tech-roast scripts. The creator keeps, revises, or rejects candidates before narration or video generation spend. Its server-side fal/VEED starter uses `fal-ai/flux/schnell` at 512×512, one image, and one inference step by default to minimize image cost.

## Run the MVP

1. Run `npm install`.
2. Run `cp .env.example .env`.
3. Add the keys you have (see below).
4. Run `npm start`, then open <http://localhost:3000>.

The app has a safe fallback mode: GitHub repository extraction works without a key; Tavily research and GPT-5.6 Luna candidate generation activate when their server-side keys are present.

## Keys

- `GITHUB_TOKEN` — optional but recommended for public GitHub API rate limits.
- `TAVILY_API_KEY` — required for public perception research, source extraction, and reviewable web evidence.
- `OPENAI_API_KEY` — required for strict-schema candidate generation with GPT-5.6 Luna.
- `OPENROUTER_API_KEY` — optional: enables Grok 4.6 as a challenger writer for side-by-side candidate batches.
- `FAL_KEY` — needed for the forthcoming fal/VEED media-generation stages. VEED Fabric and Lip Sync are hosted and billed through fal.
- `PIONEER_API_KEY` — optional until the custom perception/evidence classifier is integrated.
- `PARALLEL_API_KEY` — optional and reserved for offline retrieval benchmarking; Tavily remains the app's production research source of truth.

Never expose any of these in browser code.

## Current flow

1. Submit a public GitHub repository URL.
2. Pin its current default-branch SHA and extract bounded, line-addressable repository evidence.
3. Use Tavily, when configured, to collect reviewable public-perception records.
4. Generate 1–20 structured Roast Packets with GPT-5.6 Luna or the Grok 4.6 challenger, each with sourced observations, perception framing, original comedy, and visual evidence IDs.
5. Run RoastBench claim-grounding, framing-honesty, visual-grounding, and production-readiness gates.
6. Keep, revise, or reject takes before media generation.

## Authorised reference transcription

For creator-authorised reference clips, install the local transcription environment and run:

```sh
python3 -m venv .transcribe-venv
.transcribe-venv/bin/pip install faster-whisper yt-dlp
.transcribe-venv/bin/python scripts/transcribe_authorized_youtube.py --confirm-authorized
```

This writes timestamped JSON into the gitignored `data/authorized-reference-transcripts/` directory. It defaults to the curated Tech Roast reference list, runs `small.en` with CPU `int8`, and removes downloaded audio after successful transcription unless `--keep-audio` is specified.

## Existing fal + VEED API examples

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
