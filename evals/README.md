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
