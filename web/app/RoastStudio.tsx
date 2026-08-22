'use client';

import { FormEvent, useMemo, useState } from 'react';
import { REVIEW_LIBRARY_KEY, type ReviewVideo } from './components/VideoLibrary';

type SubjectKind = 'repository' | 'product';
type Evidence = { id: string; label: string; value: string; sourceUrl: string };
type Summary = {
  kind: SubjectKind;
  name: string;
  url: string;
  overview: string;
  researchedAt: string;
  architecture: null | { directories: string[]; files: string[]; languages: string[] };
  evidence: Evidence[];
};
type Scene = {
  id: string;
  heading: string;
  claimType: 'source-grounded' | 'creator-supplied' | 'comedic-invention';
  narration: string;
  visual: { label: string; value: string; sourceUrl: string; availability: 'unavailable'; reason: string };
};
type Plan = {
  title: string;
  treatment: string;
  persona: string;
  disclosure: string;
  mediaGenerated: boolean;
  script: string;
  scenes: Scene[];
  sourceUrl: string;
};
type Stage = 'intake' | 'research' | 'script' | 'approval' | 'complete';

const personas = [
  'Deadpan tech correspondent',
  'Dry awards-show host',
  'Overcaffeinated founder emcee',
];
const stageLabels = ['Subject', 'Research', 'Script', 'Approval'];

export default function RoastStudio() {
  const [stage, setStage] = useState<Stage>('intake');
  const [kind, setKind] = useState<SubjectKind>('repository');
  const [url, setUrl] = useState('');
  const [persona, setPersona] = useState(personas[0]);
  const [instructions, setInstructions] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [script, setScript] = useState('');
  const [checks, setChecks] = useState({ narration: false, presenter: false, visuals: false });
  const [voiceReferenceUrl, setVoiceReferenceUrl] = useState('');
  const [presenterImageUrl, setPresenterImageUrl] = useState('');
  const [mediaApproved, setMediaApproved] = useState(false);
  const [mediaResult, setMediaResult] = useState<{ audioUrl: string; videoUrl: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const currentStep = stage === 'intake' ? 0 : stage === 'research' ? 1 : stage === 'script' ? 2 : 3;
  const keptEvidence = useMemo(
    () => summary?.evidence.filter((item) => selectedEvidence.includes(item.id)) ?? [],
    [summary, selectedEvidence],
  );

  async function runResearch(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, url }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Research failed.');
      setSummary(payload.summary);
      setSelectedEvidence(payload.summary.evidence.map((item: Evidence) => item.id));
      setStage('research');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Research failed.');
    } finally {
      setBusy(false);
    }
  }

  async function createPlan() {
    if (!summary || !keptEvidence.length) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: summary.name,
          subjectUrl: summary.url,
          persona,
          customInstructions: instructions,
          evidence: keptEvidence,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Script generation failed.');
      setPlan(payload.plan);
      setScript(payload.plan.script);
      setStage('script');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Script generation failed.');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStage('intake');
    setUrl('');
    setSummary(null);
    setPlan(null);
    setScript('');
    setSelectedEvidence([]);
    setChecks({ narration: false, presenter: false, visuals: false });
    setVoiceReferenceUrl('');
    setPresenterImageUrl('');
    setMediaApproved(false);
    setMediaResult(null);
    setError('');
  }

  async function generateMedia() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: mediaApproved,
          script,
          voiceReferenceUrl,
          presenterImageUrl,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Media generation failed.');
      setMediaResult(payload.result);
      if (summary && plan) {
        const video: ReviewVideo = {
          id: crypto.randomUUID(),
          title: plan.title,
          videoUrl: payload.result.videoUrl,
          subjectName: summary.name,
          treatment: plan.treatment,
          sourceUrl: summary.url,
        };
        try {
          const existing = JSON.parse(localStorage.getItem(REVIEW_LIBRARY_KEY) || '[]');
          localStorage.setItem(REVIEW_LIBRARY_KEY, JSON.stringify([video, ...(Array.isArray(existing) ? existing : [])].slice(0, 20)));
        } catch {
          // The generated result remains visible in this session if storage is unavailable.
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Media generation failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Roastr home">
          <span className="brand-mark">R</span>ROASTR
        </a>
        <div className="safety-badge"><span /> 0 frames before approval</div>
      </header>

      <section className="studio" id="top">
        <aside className="stepper" aria-label="Creation progress">
          <p className="eyebrow">Creation flow</p>
          {stageLabels.map((label, index) => (
            <div className={`step ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'done' : ''}`} key={label}>
              <span>{index < currentStep ? '✓' : index + 1}</span>
              <div><small>Step {index + 1}</small><strong>{label}</strong></div>
            </div>
          ))}
          <div className="guardrail">
            <span>PARODY, NOT IMPERSONATION</span>
            <p>Persona choices shape tone and pacing. They never claim to be a real comedian.</p>
          </div>
        </aside>

        <div className="workspace" aria-live="polite">
          {stage === 'intake' && (
            <form onSubmit={runResearch} className="panel intake-panel">
              <div className="panel-heading">
                <p className="eyebrow">Research-led video brief</p>
                <h1>Give us a subject.<br /><em>We’ll bring receipts.</em></h1>
                <p className="lede">Turn a public repository or product page into an evidence-backed late-night roast.</p>
              </div>

              <fieldset className="field-group">
                <legend>1. Choose a subject</legend>
                <div className="segmented">
                  <button type="button" className={kind === 'repository' ? 'selected' : ''} onClick={() => setKind('repository')}>
                    <span>⌘</span><strong>Repository</strong><small>Public GitHub URL</small>
                  </button>
                  <button type="button" className={kind === 'product' ? 'selected' : ''} onClick={() => setKind('product')}>
                    <span>↗</span><strong>Product</strong><small>Public website URL</small>
                  </button>
                </div>
              </fieldset>

              <label className="field">
                <span>Public {kind === 'repository' ? 'GitHub repository' : 'product'} URL</span>
                <input required type="url" value={url} onChange={(event) => setUrl(event.target.value)}
                  placeholder={kind === 'repository' ? 'https://github.com/owner/repository' : 'https://yourproduct.com'} />
              </label>

              <fieldset className="field-group">
                <legend>2. Treatment</legend>
                <button type="button" className="treatment-card selected">
                  <span className="treatment-icon">☄</span>
                  <span><strong>Funny / Roast</strong><small>Sharp, evidence-led, late-night desk piece</small></span>
                  <span className="radio-dot" />
                </button>
              </fieldset>

              <div className="two-col">
                <label className="field">
                  <span>Original persona direction</span>
                  <select value={persona} onChange={(event) => setPersona(event.target.value)}>
                    {personas.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Custom instructions <small>optional</small></span>
                  <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Topics to include, avoid, or keep gentle…" />
                </label>
              </div>

              {error && <p className="error" role="alert">{error}</p>}
              <button className="primary" disabled={busy}>{busy ? 'Researching real sources…' : 'Research subject →'}</button>
              <p className="button-note">No media generation or billable VEED/fal.ai calls occur here.</p>
            </form>
          )}

          {stage === 'research' && summary && (
            <section className="panel">
              <div className="panel-heading compact">
                <p className="eyebrow">Source review</p>
                <h1>Keep the facts.<br /><em>Drop the weak material.</em></h1>
                <p className="lede">Everything below came from the public subject. Remove anything unsuitable before scripting.</p>
              </div>
              <div className="subject-summary">
                <div><span className="live-dot" /> LIVE PUBLIC DATA</div>
                <h2>{summary.name}</h2><p>{summary.overview}</p>
                <a href={summary.url} target="_blank" rel="noreferrer">Open source ↗</a>
              </div>

              {summary.architecture && (
                <div className="architecture-card">
                  <div><span>Root directories</span><strong>{summary.architecture.directories.join(' · ') || 'Unavailable'}</strong></div>
                  <div><span>Notable root files</span><strong>{summary.architecture.files.join(' · ') || 'Unavailable'}</strong></div>
                  <div><span>Language mix</span><strong>{summary.architecture.languages.join(' · ') || 'Unavailable'}</strong></div>
                </div>
              )}

              <div className="evidence-list">
                {summary.evidence.map((item) => {
                  const selected = selectedEvidence.includes(item.id);
                  return (
                    <label className={`evidence-card ${selected ? 'kept' : 'removed'}`} key={item.id}>
                      <input type="checkbox" checked={selected} onChange={() => setSelectedEvidence((current) =>
                        current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]
                      )} />
                      <span className="checkmark">{selected ? '✓' : '—'}</span>
                      <span><strong>{item.label}</strong><p>{item.value}</p><small>{selected ? 'Included in script' : 'Removed from script'}</small></span>
                    </label>
                  );
                })}
              </div>
              {error && <p className="error" role="alert">{error}</p>}
              <div className="actions">
                <button className="secondary" onClick={() => setStage('intake')}>← Edit brief</button>
                <button className="primary" disabled={busy || !keptEvidence.length} onClick={createPlan}>
                  {busy ? 'Writing from approved evidence…' : `Generate script from ${keptEvidence.length} source${keptEvidence.length === 1 ? '' : 's'} →`}
                </button>
              </div>
            </section>
          )}

          {stage === 'script' && plan && (
            <section className="panel">
              <div className="panel-heading compact">
                <p className="eyebrow">Script & scene plan</p>
                <h1>The desk is set.<br /><em>Review every line.</em></h1>
                <p className="lede">Facts link to source evidence. Punchlines are visibly labeled as comedic invention.</p>
              </div>
              <div className="disclosure">{plan.disclosure}</div>
              <label className="field script-editor"><span>Presenter narration <small>reviewed as one approved script</small></span>
                <textarea value={script} readOnly />
              </label>
              <div className="scene-list">
                {plan.scenes.map((scene, index) => (
                  <article className="scene-card" key={scene.id}>
                    <div className="scene-number">{String(index + 1).padStart(2, '0')}</div>
                    <div className="scene-copy">
                      <div className="scene-topline"><strong>{scene.heading}</strong><span className={`claim ${scene.claimType}`}>{scene.claimType}</span></div>
                      <p>{scene.narration}</p>
                    </div>
                    <div className="visual-proof"><small>SUPPORTING VISUAL · UNAVAILABLE</small><strong>{scene.visual.label}</strong>
                      <p>{scene.visual.reason}</p><a href={scene.visual.sourceUrl} target="_blank" rel="noreferrer">Evidence source ↗</a>
                    </div>
                  </article>
                ))}
              </div>
              <div className="actions">
                <button className="secondary" onClick={() => setStage('research')}>← Review sources</button>
                <button className="primary" onClick={() => setStage('approval')}>Continue to approvals →</button>
              </div>
            </section>
          )}

          {stage === 'approval' && plan && (
            <section className="panel">
              <div className="panel-heading compact">
                <p className="eyebrow">Final checkpoint</p>
                <h1>Nothing renders<br /><em>until you say so.</em></h1>
                <p className="lede">Review narration, the presenter/lip-sync path, and every supporting visual.</p>
              </div>
              <div className="approval-grid">
                <ApprovalCard number="01" title="Narration" status="Script ready · audio unavailable"
                  detail={`${script.split(/\s+/).filter(Boolean).length} words approved for an original ${plan.persona.toLowerCase()}. No voice has been synthesized.`}
                  checked={checks.narration} onChange={() => setChecks({ ...checks, narration: !checks.narration })} />
                <ApprovalCard number="02" title="Presenter + lip sync" status="Licensed media not supplied"
                  detail="VEED Fabric is the planned path. A licensed presenter image and approved narration audio remain explicit input gaps; generation stays blocked."
                  checked={checks.presenter} onChange={() => setChecks({ ...checks, presenter: !checks.presenter })} />
                <ApprovalCard number="03" title="Supporting visuals" status={`${plan.scenes.length} sourced evidence cards`}
                  detail="Every scene keeps its source link and an explicit unavailable state. No screenshot, reaction, or architecture visual was invented."
                  checked={checks.visuals} onChange={() => setChecks({ ...checks, visuals: !checks.visuals })} />
              </div>
              <div className="generation-lock"><span>LOCKED</span><div><strong>No provider call occurs at this checkpoint</strong>
                <p>Media generation is a separate, explicit billable action after the creative package is approved.</p></div></div>
              <div className="actions">
                <button className="secondary" onClick={() => setStage('script')}>← Review script</button>
                <button className="primary" disabled={!Object.values(checks).every(Boolean)} onClick={() => setStage('complete')}>Approve creative package →</button>
              </div>
            </section>
          )}

          {stage === 'complete' && plan && (
            <section className="panel complete-panel">
              <div className="complete-mark">✓</div><p className="eyebrow">Approval recorded in this session</p>
              <h1>{mediaResult ? 'Presenter video ready.' : 'Creative package approved.'}<br /><em>{mediaResult ? 'Built from approved inputs.' : 'Zero frames generated.'}</em></h1>
              <p className="lede">The evidence, narration, and SNL-style scene plan are ready. Generation requires licensed presenter and voice-reference media plus a separate cost acknowledgement.</p>
              <div className="receipt">
                <div><span>Subject</span><strong>{summary?.name}</strong></div><div><span>Treatment</span><strong>{plan.treatment}</strong></div>
                <div><span>Evidence items</span><strong>{keptEvidence.length}</strong></div><div><span>Scenes</span><strong>{plan.scenes.length}</strong></div>
                <div><span>Billable calls this session</span><strong>{mediaResult ? '2' : '0'}</strong></div>
              </div>
              {mediaResult ? (
                <div className="media-result">
                  <video src={mediaResult.videoUrl} controls />
                  <div><a href={mediaResult.videoUrl} target="_blank" rel="noreferrer">Open generated video ↗</a>
                    <a href={mediaResult.audioUrl} target="_blank" rel="noreferrer">Open narration audio ↗</a></div>
                </div>
              ) : (
                <div className="generation-form">
                  <p className="eyebrow">Optional billable generation</p>
                  <div className="two-col">
                    <label className="field"><span>Licensed voice reference URL</span><input type="url" value={voiceReferenceUrl} onChange={(event) => setVoiceReferenceUrl(event.target.value)} placeholder="https://…/licensed-voice.wav" /></label>
                    <label className="field"><span>Licensed presenter image URL</span><input type="url" value={presenterImageUrl} onChange={(event) => setPresenterImageUrl(event.target.value)} placeholder="https://…/licensed-presenter.png" /></label>
                  </div>
                  <label className="cost-approval"><input type="checkbox" checked={mediaApproved} onChange={(event) => setMediaApproved(event.target.checked)} />
                    <span>I own or license both inputs and approve two billable calls: Chatterbox narration ($0.025 / 1,000 characters), then VEED Fabric at 480p.</span></label>
                  {error && <p className="error" role="alert">{error}</p>}
                  <button className="primary" disabled={busy || !mediaApproved || !voiceReferenceUrl || !presenterImageUrl} onClick={generateMedia}>
                    {busy ? 'Generating narration, then presenter…' : 'Generate approved presenter video →'}
                  </button>
                </div>
              )}
              <button className="primary" onClick={reset}>Start another roast</button>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

function ApprovalCard({ number, title, status, detail, checked, onChange }: {
  number: string; title: string; status: string; detail: string; checked: boolean; onChange: () => void;
}) {
  return (
    <label className={`approval-card ${checked ? 'approved' : ''}`}>
      <input type="checkbox" checked={checked} onChange={onChange} /><span className="approval-number">{number}</span>
      <span className="approval-copy"><strong>{title}</strong><small>{status}</small><p>{detail}</p></span>
      <span className="approval-check">{checked ? '✓' : ''}</span>
    </label>
  );
}
