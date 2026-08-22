# Eval bench

This is deliberately separate from both app surfaces. It imports the shared source extractors and writers, but has no server routes, UI components, persistence, or media-generation calls.

It compares a matrix of:

- providers: deterministic fallback, GPT, Grok, or any explicit OpenRouter model;
- source mixes: repository only, repository plus Tavily perception, transcript-derived pacing signals, authorised transcript source cards, or full context;
- generated packets: grounding gates, source/perception-line rates, duration, angle diversity, raw candidate outputs, and a provider-blind human-review file.

Run a small paid matrix first:

```sh
npm run evals -- --repo https://github.com/owner/repository --count 3
```

Compare an additional OpenRouter model and only the useful context ablations:

```sh
npm run evals -- --repo https://github.com/owner/repository --providers gpt,grok,openrouter:openai/gpt-4.1 --profiles repo_only,repo_plus_reference_sources,full_context --count 6
```

## Ollama / Qwen challenger

Set the endpoint and default model in the environment, then add `ollama` to the provider matrix. The endpoint must be the OpenAI-compatible `/v1` URL.

```sh
export OLLAMA_BASE_URL=http://100.117.78.96:11434/v1
export OLLAMA_MODEL=orcarouter/Qwen3.8-27B-Uncensored:latest
npm run evals -- --repo https://github.com/owner/repository --providers gpt,grok,ollama --profiles repo_only,repo_plus_reference_sources --reference-strength light --count 3
```

Override the model for one run with `ollama:your-model-id`.

## Deploy as a job

The bench is not a web service: deploy it as an on-demand or scheduled job and retain the gitignored `/app/data/eval-runs` volume as its artifact store. On a machine that can reach the selected sources and model endpoints:

```sh
docker compose -f evals/compose.yml run --rm evals --repo https://github.com/owner/repository --providers gpt,grok,ollama --profiles repo_only,full_context --count 3
```

For recurring evaluation, schedule that command with the host scheduler or a CI runner. A cloud runner needs access to the Ollama tailnet endpoint; otherwise run it on a tailnet-connected machine and export only the artifact directory to durable storage.

Artifacts are written under the gitignored `data/eval-runs/` directory. The source-card profile uses short opening, middle, and closing excerpts from the local authorised transcript corpus as a dedicated reference-data axis; it tells writers to analyse mechanics only and produce fresh repository-specific material. The signals-only profile is available when you want no transcript wording in the prompt.

Use `--reference-strength light` (default, three evenly sampled sources), `medium` (six), or `strong` (the whole corpus). Compare it directly with `repo_only` and `repo_plus_reference_signals`; do not assume stronger anchoring makes the jokes better.

## Human comedy review

The auto-scores measure mechanical quality, not whether a joke is funny. Give the reviewer only `blind-review.md` first: it labels outputs `Candidate A`, `Candidate B`, and so on, with provider, model, and source-mix names removed. Record outcomes in the adjacent `review.csv` using `candidate-a`, `candidate-b`, and so on for `run_id`; the compiler resolves those aliases after the review. Use `keep`, `revise`, or `reject`, a rank, and one concrete reason. Equal ranks mean a tie.

Add optional `mechanics`, `tone`, and `grounding` labels when useful. Recommended mechanics include `specificity`, `mismatch`, `escalation`, `misdirection`, and `callback`; use `|` between multiple values. This lets us learn *why* something won without treating a generic LLM score as ground truth. Reveal `results.json` only after ranking to compare provider, source mix, duration, and grounding failures.

`npm run evals:compile-feedback` turns ranks into every valid pairwise preference, plus a 0–100 pairwise win score and Wilson 95% interval in `evals/shared-runs/leaderboard.json`. The interval is deliberately honest about small samples: it is a prioritisation aid, not proof that a model is funnier.

## Production comedy baseline

Use this for actual prompt and output choices. It calls the same `web/lib/comedy.mjs` `generateComedyScript` function used by the app, including the live `joke_guidelines.md`, production model, temperature, and cleanup. It is separate only in how it records and blinds candidates.

```sh
GITHUB_TOKEN="$(gh auth token)" npm run evals:production -- --subject https://github.com/owner/repository --cycles 3
```

That creates nine candidates: three each for the no-extra-direction baseline, a one-premise direction, and a viewer-first direction. First rank `blind-review.md`; then fill `review.csv` with `candidate-a`, `candidate-b`, etc. This is a baseline for choosing the studio default, not a claim that any prompt direction is universally funniest.

Production runs now merge configured official X/Reddit research with Tavily context before building the same research brief used by the app. If those official credentials are absent, the run continues with the available public sources and records the warning in its manifest.

Run a local or gateway model against the same production prompt with its OpenAI-compatible endpoint:

```sh
GITHUB_TOKEN="$(gh auth token)" npm run evals:production -- --subject https://github.com/owner/repository --cycles 3 --provider openai-compatible --base-url http://100.117.78.96:4000/v1 --model qwen9b-heretic
```

This does not make the challenger the app default. It provides an identical-prompt blind challenger run to review beside the production-Luna baseline.

For an OpenRouter challenger, keep the key in the environment and refer to its variable name rather than putting a secret in a command or eval artifact:

```sh
GITHUB_TOKEN="$(gh auth token)" npm run evals:production -- --subject https://github.com/openclaw/openclaw --template roast --cycles 1 --provider openai-compatible --base-url https://openrouter.ai/api/v1 --api-key-env OPENROUTER_API_KEY --model x-ai/grok-4.6
```

Use `--timeout-ms 30000` for an interactive challenger smoke test; default runs allow 90 seconds per attempt.

## Master blind arena

After publishing fresh production, Qwen, and Venice runs generated under the same current `joke_guidelines.md`, combine them into one shuffled scorecard:

```sh
npm run evals:arena -- --runs production-current,qwen-current,venice-current --id current-guidelines-arena
```

The resulting `blind-review.md` hides source run, provider, model, and prompt direction. Its `review.csv` is prefilled with one row per valid candidate. Rank that single sheet first; only then inspect `results.json` to reveal the provider and direction behind each candidate.

## Spam-review UI

Run the local reviewer against a master arena:

```sh
npm run evals:reviewer -- --arena evals/shared-runs/current-guidelines-arena
```

Open `http://127.0.0.1:4174`. It shows two anonymous scripts at a time; choose left, right, or tie, add an optional note, then explicitly save. Arrow-left, arrow-right, and `=` select a choice but do not advance. Previous/Next lets reviewers revisit and overwrite any comparison before saving it to the arena's `pairwise-review.json`, without exposing provider, model, direction, or candidate identity.

The expandable **Joke guidelines** editor writes the real root `joke_guidelines.md`, which is the production comedy system prompt. Save a revision, create a fresh master arena, and review it separately—never overwrite the arena you are currently judging.
