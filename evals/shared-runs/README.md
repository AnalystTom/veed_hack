# Shared eval runs

Each subdirectory is a reviewed, Git-backed evaluation bundle promoted from a local `data/eval-runs/<run-id>` artifact with:

- `manifest.json` — run configuration, repository pin, and aggregate reference-corpus statistics;
- `results.json` — provider-labelled packets and mechanical scores;
- `blind-review.md` — the same packets without provider labels for first-pass human ranking;
- `review.csv` — the shared keep/revise/reject record.

Publish a completed local run with:

```sh
npm run evals:publish -- data/eval-runs/<run-id>
git add evals/shared-runs/<run-id>
git commit -m "eval: review <run-id>"
git pull --rebase origin main
git push origin main
```

Do not add local transcripts, downloaded audio, `.env`, API keys, or raw reference-card excerpts. The publish script removes the transcript-card material from `manifest.json` before creating a shared bundle.
