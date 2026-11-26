import React, { useEffect, useRef, useState } from 'react';
import { ScanText, Sparkles, Trash2, LoaderCircle, RotateCcw, ShieldCheck, CircleAlert, CheckCircle2 } from 'lucide-react';
import { SectionHeader, Card, Badge, ProgressBar, EmptyState } from '../components/UI.jsx';
import ResultPanel from '../components/ResultPanel.jsx';
import { MAX_MESSAGE_LENGTH } from '../engine/validate.js';

const SAMPLES = [
  { id: 'internship', label: 'Internship fee request', text: 'Congratulations! You are selected for a paid internship. Pay a refundable registration fee of Rs 1,500 via UPI today to receive your offer letter. Offer valid for 2 hours.' },
  { id: 'scholarship', label: 'Scholarship processing fee', text: 'Your scholarship of Rs 25,000 is approved. Pay Rs 990 processing fee and share your Aadhaar details on the link to release the first instalment.' },
  { id: 'faculty', label: 'Fake faculty message', text: 'This is Professor Rao. I need your bank details urgently for a scholarship list. Do not inform the office yet; share them privately in the morning.' },
  { id: 'legit', label: 'Genuine placement notice', text: 'Placement cell notice: the written test is scheduled for Friday at 10 AM in Lab 3. The shortlist is on the official portal. No fee is charged at any stage.' },
];

export default function Analyzer({ engine, handoff }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const { model, loadModel } = engine;

  // Initialize the pretrained model when the analyzer opens. Analysis still
  // works with rules if this fails; retry stays manual and explicit.
  useEffect(() => {
    if (model.status === 'not-initialized') loadModel();
  }, [model.status, loadModel]);

  useEffect(() => {
    if (handoff?.text) {
      setText(handoff.text);
      setResult(null);
      setError('');
      inputRef.current?.focus();
    }
  }, [handoff]);

  const runAnalysis = async () => {
    setError('');
    setLoading(true);
    setResult(null);
    try {
      setResult(await engine.analyze(text));
    } catch (cause) {
      setError(cause?.message || 'Analysis could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  const modelLabel = {
    'not-initialized': 'Model will initialize',
    loading: 'Initializing model…',
    ready: 'Model initialized',
    unavailable: 'Model unavailable · rules active',
  }[model.status];
  const modelTone = { ready: 'success', loading: 'warning', unavailable: 'danger' }[model.status] || 'neutral';

  return (
    <div>
      <SectionHeader
        eyebrow="CAMPUS MESSAGE ANALYZER"
        title="Check a campus message before you act"
        description="Paste an SMS, WhatsApp message or email. You will see the detected indicators, the semantic evidence and exactly how the score was built."
        action={<Badge tone={modelTone}><Sparkles size={13} />{modelLabel}</Badge>}
      />

      <div className="analyzer-grid">
        <div className="analyzer-left">
          <Card className="panel">
            <div className="panel-head">
              <div><span className="panel-step">01</span><h2>Message</h2></div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setText(''); setResult(null); setError(''); }} disabled={!text && !result}><Trash2 size={14} /> Clear</button>
            </div>
            <label className="field-label" htmlFor="message-input">Suspicious message text</label>
            <textarea
              ref={inputRef}
              id="message-input"
              className="message-input"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_MESSAGE_LENGTH + 1))}
              placeholder="Paste a message about an internship, scholarship, placement, event, hostel or portal…"
              rows={10}
              aria-describedby="message-count"
            />
            <div className="input-footer">
              <span id="message-count" className={text.length > MAX_MESSAGE_LENGTH ? 'over-limit' : ''}>{text.length} / {MAX_MESSAGE_LENGTH} characters</span>
              <span>Local analysis · no upload</span>
            </div>
            {error && <div className="inline-error" role="alert"><CircleAlert size={15} />{error}</div>}
            <button className="btn btn-primary btn-wide" onClick={runAnalysis} disabled={loading || !text.trim()}>
              {loading ? <><LoaderCircle size={17} className="spin" /> Analyzing…</> : <><ScanText size={17} /> Analyze message</>}
            </button>
            {text.length > MAX_MESSAGE_LENGTH && <p className="inline-error" role="alert">Shorten the message to {MAX_MESSAGE_LENGTH} characters before analyzing.</p>}
          </Card>

          <Card className="panel">
            <div className="panel-head"><div><span className="panel-step">02</span><h2>Try a campus example</h2></div></div>
            <div className="sample-grid">
              {SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  className={`sample-chip ${text === sample.text ? 'active' : ''}`}
                  onClick={() => { setText(sample.text); setResult(null); setError(''); }}
                >{sample.label}</button>
              ))}
            </div>
            <p className="hint">Examples are illustrative. Type your own message any time — the same engine is used.</p>
          </Card>

          <Card className="panel model-panel">
            <div className="panel-head"><div><span className="panel-step">03</span><h2>Semantic model</h2></div><Badge tone={modelTone}>{model.status.replace('-', ' ')}</Badge></div>
            <p className="muted-copy">A pretrained MiniLM model runs in this browser and compares meaning with authored student messages. Rules continue to work even if the model cannot load.</p>

            {model.status === 'loading' && <ProgressBar label="Initializing local ONNX model" />}
            {model.status === 'unavailable' && (
              <>
                <div className="inline-error" role="alert">Model unavailable: {model.error}</div>
                <div className="model-detail"><CircleAlert size={15} /> Analysis is running in rule-based mode. No semantic evidence will be shown.</div>
              </>
            )}
            {model.status === 'ready' && (
              <div className="model-detail"><CheckCircle2 size={15} /> Model initialized. Semantic inference runs on each analysis; its contribution is shown in the result.</div>
            )}
            <button
              className="btn btn-secondary btn-sm"
              onClick={loadModel}
              disabled={model.status === 'loading' || model.status === 'ready'}
            >
              {model.status === 'ready' ? <><ShieldCheck size={14} /> Initialized</> : model.status === 'unavailable' ? <><RotateCcw size={14} /> Retry model</> : <><Sparkles size={14} /> {model.status === 'not-initialized' ? 'Load model' : 'Loading…'}</>}
            </button>
          </Card>
        </div>

        <Card className="panel result-panel">
          <div className="panel-head">
            <div><span className="panel-step">04</span><h2>Assessment</h2></div>
            {result && <Badge tone={result.level === 'high' ? 'danger' : result.level === 'low' ? 'success' : 'warning'}>{result.level}</Badge>}
          </div>
          {loading ? (
            <div className="skeleton-stack" aria-label="Analyzing message">
              <div className="skeleton skeleton-gauge" /><div className="skeleton" /><div className="skeleton" /><div className="skeleton short" />
            </div>
          ) : result ? (
            <ResultPanel result={result} />
          ) : (
            <EmptyState icon={ScanText} title="No analysis yet">
              Paste a campus message on the left and choose <strong>Analyze message</strong>. Results appear here with the evidence behind every point.
            </EmptyState>
          )}
        </Card>
      </div>
    </div>
  );
}
