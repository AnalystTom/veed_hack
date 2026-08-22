# Shared eval runs

Each subdirectory is a reviewed, Git-backed evaluation bundle promoted from a local `data/eval-runs/<run-id>` artifact with:

- `manifest.json` — run configuration, repository pin, and aggregate reference-corpus statistics;
- `results.json` — provider-labelled packets or production-script candidates and mechanical scores;
- `blind-review.md` — the same packets as opaque candidate labels for first-pass human ranking;
- `review.csv` — the shared keep/revise/reject record, plus optional comedy-mechanic labels. Use `candidate-a`, `candidate-b`, etc. from the blind sheet as the `run_id` while reviewing; the compiler maps them back after the fact.

Publish a completed local run with either a packet-bench or production-comedy local path:

```sh
npm run evals:publish -- data/eval-runs/<run-id>
# or
npm run evals:publish -- data/production-comedy-runs/<run-id>
git add evals/shared-runs/<run-id>
git commit -m "eval: review <run-id>"
git pull --rebase origin main
git push origin main
```

Do not add local transcripts, downloaded audio, `.env`, API keys, or raw reference-card excerpts. The publish script removes the transcript-card material from `manifest.json` before creating a shared bundle.

Regenerate the cross-run human-feedback dataset after adding reviews. It derives strict preference pairs and a pairwise win-rate leaderboard with uncertainty bounds; the latter will stay wide until we have many independent reviews:

```sh
npm run evals:compile-feedback
git add evals/shared-runs/leaderboard.json evals/shared-runs/preference-pairs.jsonl
git commit -m "eval: compile feedback"
```
