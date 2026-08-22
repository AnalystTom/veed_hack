'use client';

import Link from 'next/link';
import { FormEvent, ReactNode, useState } from 'react';

import { VIDEO_TEMPLATES } from '../lib/templates.mjs';
import shell from './components/BrandShell.module.css';
import styles from './RoastStudio.module.css';

type Evidence = { id: string; label: string; value: string; sourceUrl: string };
type Summary = {
  name: string;
  url: string;
  overview: string;
  evidence: Evidence[];
  researchBrief: string;
  researchMode: string;
  researchWarning?: string;
  visualUrl?: string;
};
type ComedyScript = { script: string; templateId: string; subjectName: string };
type GenerationStage = 'idle' | 'planning' | 'narrating' | 'animating' | 'complete' | 'failed';
type FailedStage = 'plan' | 'narration' | 'video' | null;

function MarkdownLine({ line, index }: { line: string; index: number }) {
  if (line.startsWith('# ')) return <h2 key={index}>{line.slice(2)}</h2>;
  if (line.startsWith('## ')) return <h3 key={index}>{line.slice(3)}</h3>;
  if (!line.trim()) return <div className={styles.markdownSpace} key={index} aria-hidden="true" />;
  if (line.startsWith('- ')) {
    const value = line.slice(2);
    const link = value.match(/^\[([^\]]+)\]\((https:\/\/[^)]+)\)$/);
    if (link) {
      return <p className={styles.markdownBullet} key={index}>• <a href={link[2]} target="_blank" rel="noreferrer">{link[1]} ↗</a></p>;
    }
    const labelled = value.match(/^\*\*([^*]+):\*\*\s*(.*)$/);
    return (
      <p className={styles.markdownBullet} key={index}>
        • {labelled ? <><strong>{labelled[1]}:</strong> {labelled[2]}</> : value}
      </p>
    );
  }
  return <p key={index}>{line}</p>;
}

function MarkdownBrief({ children }: { children: string }) {
  return <div className={styles.markdown}>{children.split('\n').map((line, index) => <MarkdownLine line={line} index={index} key={index} />)}</div>;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'The request failed.');
  return payload;
}

function StepLabel({ number, children }: { number: string; children: ReactNode }) {
  return <div className={styles.stepLabel}><span>{number}</span>{children}</div>;
}

export default function RoastStudio() {
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [researching, setResearching] = useState(false);
  const [proceeded, setProceeded] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [plan, setPlan] = useState<ComedyScript | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [generationStage, setGenerationStage] = useState<GenerationStage>('idle');
  const [failedStage, setFailedStage] = useState<FailedStage>(null);
  const [error, setError] = useState('');

  const generating = ['planning', 'narrating', 'animating'].includes(generationStage);

  function resetGeneration() {
    setPlan(null);
    setAudioUrl('');
    setVideoUrl('');
    setGenerationStage('idle');
    setFailedStage(null);
    setError('');
  }

  function changeSubject() {
    setSummary(null);
    setProceeded(false);
    setCustomInstructions('');
    setTemplateId('');
    resetGeneration();
  }

  async function runResearch(event: FormEvent) {
    event.preventDefault();
    setResearching(true);
    setError('');
    setSummary(null);
    setProceeded(false);
    resetGeneration();
    try {
      const payload = await postJson<{ summary: Summary }>('/api/research', { url });
      setSummary(payload.summary);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Research failed.');
    } finally {
      setResearching(false);
    }
  }

  function selectTemplate(nextTemplateId: string) {
    if (nextTemplateId !== templateId) resetGeneration();
    setTemplateId(nextTemplateId);
  }

  async function generateVideo() {
    if (!summary || !templateId) return;
    setError('');
    let nextPlan = plan;
    let nextAudioUrl = audioUrl;
    let activeFailure: FailedStage = null;
    try {
      if (!nextPlan || failedStage === 'plan') {
        activeFailure = 'plan';
        setGenerationStage('planning');
        const payload = await postJson<{ plan: ComedyScript }>('/api/plan', {
          subjectName: summary.name,
          researchBrief: summary.researchBrief,
          customInstructions,
          templateId,
        });
        nextPlan = payload.plan;
        setPlan(nextPlan);
        nextAudioUrl = '';
        setAudioUrl('');
      }

      if (!nextAudioUrl || failedStage === 'narration' || activeFailure === 'plan') {
        activeFailure = 'narration';
        setGenerationStage('narrating');
        const payload = await postJson<{ result: { audioUrl: string } }>('/api/generate/narration', {
          approved: true,
          script: nextPlan.script,
          templateId,
        });
        nextAudioUrl = payload.result.audioUrl;
        setAudioUrl(nextAudioUrl);
      }

      activeFailure = 'video';
      setGenerationStage('animating');
      const payload = await postJson<{ result: { videoUrl: string } }>('/api/generate/video', {
        approved: true,
        audioUrl: nextAudioUrl,
        templateId,
        subjectName: summary.name,
        subjectVisualUrl: summary.visualUrl,
      });
      setVideoUrl(payload.result.videoUrl);
      setGenerationStage('complete');
      setFailedStage(null);
    } catch (cause) {
      setFailedStage(activeFailure);
      setGenerationStage('failed');
      setError(cause instanceof Error ? cause.message : 'Video generation failed.');
    }
  }

  const retryLabel = failedStage === 'video' ? 'Retry video animation' : failedStage === 'narration' ? 'Retry narration' : 'Retry generation';

  return (
    <main className={`${shell.page} ${styles.page}`}>
      <nav className={shell.nav}>
        <strong><Link href="/">Roastr</Link></strong>
        <Link href="/" className={`${shell.pill} ${shell.navCta}`}>Back home</Link>
      </nav>

      <div className={shell.neutralBackdrop} aria-hidden="true" />
      <div className={shell.scrim} aria-hidden="true" />

      <section className={styles.wizard} aria-labelledby="wizard-title">
        <StepLabel number="01">Subject</StepLabel>
        <section className={styles.panel}>
          <header className={styles.heroHeader}>
            <p>Research-led comedy video</p>
            <h1 id="wizard-title">Give us a subject.<br /><em>We’ll bring receipts.</em></h1>
            <span>Paste one public GitHub repository or website. Roastr gathers the public story before it writes the joke.</span>
          </header>

          <form onSubmit={runResearch} className={styles.subjectForm}>
            <label className={styles.field}>
              <span>Public GitHub repository or website URL</span>
              <input
                required
                disabled={researching || Boolean(summary)}
                type="text"
                inputMode="url"
                autoComplete="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://github.com/owner/repository or https://yourproduct.com"
              />
            </label>
            {summary ? (
              <button className={styles.secondary} type="button" onClick={changeSubject}>Change URL</button>
            ) : (
              <button className={styles.primary} disabled={researching}>{researching ? 'Researching public context…' : 'Roast it →'}</button>
            )}
          </form>
          {!summary && <small className={styles.note}>No video-generation call occurs until you choose a template.</small>}
          {error && !proceeded && <p className={styles.error} role="alert">{error}</p>}
        </section>

        {summary && (
          <section className={styles.flowSection} aria-labelledby="research-title">
            <StepLabel number="02">Research Brief</StepLabel>
            <div className={styles.researchCard}>
              <div className={styles.researchMeta}>
                <small>{summary.researchMode.includes('tavily') ? 'TAVILY + DIRECT PUBLIC DATA + GPT-5.6 LUNA' : summary.researchMode.includes('gpt-5.6-luna') ? 'DIRECT PUBLIC DATA + GPT-5.6 LUNA' : 'DIRECT PUBLIC DATA'}</small>
                <a href={summary.url} target="_blank" rel="noreferrer">Open subject ↗</a>
              </div>
              <div id="research-title"><MarkdownBrief>{summary.researchBrief}</MarkdownBrief></div>
              {summary.researchWarning && <p className={styles.warning}>{summary.researchWarning}</p>}
              {!proceeded && <button className={styles.primary} type="button" onClick={() => setProceeded(true)}>Proceed →</button>}
            </div>
          </section>
        )}

        {summary && proceeded && (
          <section className={styles.flowSection} aria-labelledby="direction-title">
            <StepLabel number="03">Creative direction</StepLabel>
            <div className={styles.directionCard}>
              <header>
                <p>ONE OPTIONAL INPUT</p>
                <h2 id="direction-title">Tell the joke your way.</h2>
              </header>
              <label className={styles.field}>
                <span>Custom instructions</span>
                <textarea
                  value={customInstructions}
                  disabled={generating}
                  onChange={(event) => { setCustomInstructions(event.target.value); resetGeneration(); }}
                  placeholder="Focus on the stale README, keep it sharp, and avoid jokes about the team."
                  maxLength={1200}
                />
              </label>

              <div className={styles.templateGrid} role="radiogroup" aria-label="Video template">
                {VIDEO_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    className={`${styles.templateCard} ${templateId === template.id ? styles.templateSelected : ''}`}
                    type="button"
                    role="radio"
                    aria-checked={templateId === template.id}
                    disabled={generating}
                    onClick={() => selectTemplate(template.id)}
                  >
                    <img src={template.imagePath} alt={`${template.name} fictional presenter`} />
                    <span className={styles.templateCopy}>
                      <small>{template.eyebrow}</small>
                      <strong>{template.name}</strong>
                      <span>{template.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {summary && proceeded && templateId && (
          <section className={styles.flowSection} aria-labelledby="generation-title">
            <StepLabel number="04">Generate</StepLabel>
            <div className={styles.generationCard}>
              <header>
                <p>ELEVENLABS ELEVEN V3 + VEED FABRIC</p>
                <h2 id="generation-title">Turn the brief into a vertical video.</h2>
                <span>This makes a real provider call. The chosen fictional presenter and voice stay fixed to the template.</span>
              </header>

              {generationStage !== 'idle' && (
                <ol className={styles.progress} aria-live="polite">
                  <li data-state={['narrating', 'animating', 'complete'].includes(generationStage) || Boolean(plan) ? 'complete' : generationStage === 'planning' ? 'active' : 'pending'}>Write evidence-grounded script</li>
                  <li data-state={['animating', 'complete'].includes(generationStage) || Boolean(audioUrl) ? 'complete' : generationStage === 'narrating' ? 'active' : 'pending'}>Generate ElevenLabs narration</li>
                  <li data-state={generationStage === 'complete' ? 'complete' : generationStage === 'animating' ? 'active' : 'pending'}>Animate with VEED Fabric</li>
                </ol>
              )}

              {plan && (
                <details className={styles.scriptPreview}>
                  <summary>Generated script</summary>
                  <p>{plan.script}</p>
                </details>
              )}

              {error && proceeded && <p className={styles.error} role="alert">{error}</p>}

              {videoUrl ? (
                <section className={styles.videoResult} aria-labelledby="video-title">
                  <small>GENERATION COMPLETE · REAL PROVIDER OUTPUT</small>
                  <h2 id="video-title">Your product just got the microphone.</h2>
                  <video src={videoUrl} controls playsInline preload="metadata" />
                  <div>
                    <a className={styles.primary} href={videoUrl} target="_blank" rel="noreferrer">Open video ↗</a>
                    <button className={styles.secondary} type="button" onClick={changeSubject}>Roast another</button>
                  </div>
                </section>
              ) : (
                <button className={styles.primary} type="button" disabled={generating} onClick={generateVideo}>
                  {generating ? 'Generating…' : generationStage === 'failed' ? `${retryLabel} →` : 'Generate video →'}
                </button>
              )}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
