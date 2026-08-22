'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

import shell from './components/BrandShell.module.css';
import styles from './RoastStudio.module.css';

type Summary = {
  name: string;
  url: string;
  overview: string;
  evidence: Array<{ id: string; label: string; value: string; sourceUrl: string }>;
};

export default function RoastStudio() {
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function runResearch(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSummary(null);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Research failed.');
      setSummary(payload.summary);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Research failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={`${shell.page} ${styles.page}`}>
      <nav className={shell.nav}>
        <strong><Link href="/">Roastr</Link></strong>
        <Link href="/" className={`${shell.pill} ${shell.navCta}`}>Back home</Link>
      </nav>

      <div className={shell.neutralBackdrop} aria-hidden="true" />
      <div className={shell.scrim} aria-hidden="true" />

      <section className={styles.wizard} aria-labelledby="wizard-title">
        <div className={styles.stepLabel}><span>01</span> Subject</div>
        <form onSubmit={runResearch} className={styles.panel}>
          <header>
            <p>Research-led video brief</p>
            <h1 id="wizard-title">Give us a subject.<br /><em>We’ll bring receipts.</em></h1>
            <span>Paste one public GitHub repository or website URL. We detect the source and ingest its available public evidence together.</span>
          </header>

          <label className={styles.field}>
            <span>Public GitHub repository or website URL</span>
            <input
              required
              disabled={busy}
              type="url"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setSummary(null);
                setError('');
              }}
              placeholder="https://github.com/owner/repository or https://yourproduct.com"
            />
          </label>

          {error && <p className={styles.error} role="alert">{error}</p>}
          {summary && (
            <section className={styles.result} aria-label="Research result">
              <small>INGESTION COMPLETE · LIVE PUBLIC DATA</small>
              <strong>{summary.name}</strong>
              <p>{summary.overview}</p>
              <div>
                <span>{summary.evidence.length} source item{summary.evidence.length === 1 ? '' : 's'} found</span>
                <a href={summary.url} target="_blank" rel="noreferrer">Open source ↗</a>
              </div>
              <ul className={styles.evidence}>
                {summary.evidence.map((item) => (
                  <li key={item.id}>
                    <strong>{item.label}</strong>
                    <span>{item.value}</span>
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer">Source ↗</a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <button className={styles.primary} disabled={busy}>
            {busy ? 'Ingesting public sources…' : 'Ingest URL →'}
          </button>
          <small className={styles.note}>No billable VEED or fal.ai call occurs here.</small>
        </form>
      </section>
    </main>
  );
}
