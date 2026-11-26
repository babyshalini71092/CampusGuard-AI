import React, { useEffect, useRef, useState } from 'react';
import { ImageUp, LoaderCircle, ScanLine, ArrowRight, CircleAlert, KeyRound, X } from 'lucide-react';
import { SectionHeader, Card, Badge, ProgressBar, Alert } from '../components/UI.jsx';
import ResultPanel from '../components/ResultPanel.jsx';
import { validateImage, MAX_IMAGE_BYTES } from '../engine/validate.js';

const ASSET_BASE = import.meta.env.BASE_URL || '/';

export default function Screenshot({ engine, onSendText }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [text, setText] = useState('');
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('idle');
  const [ocrBusy, setOcrBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  const workerRef = useRef(null);
  const selectionRef = useRef(0);
  const editRef = useRef(0);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => () => {
    selectionRef.current += 1;
    const worker = workerRef.current;
    workerRef.current = null;
    worker?.then((instance) => instance.terminate()).catch(() => {});
  }, []);

  const chooseFile = (picked) => {
    selectionRef.current += 1;
    const check = validateImage(picked);
    setError(''); setResult(null); setText(''); setStage('idle'); setProgress(0);
    if (!check.ok) { setError(check.error); setFile(null); setPreview(null); return; }
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const extractText = async () => {
    if (!file) { setError('Choose a screenshot first.'); return; }
    if (ocrBusy) return;
    const selection = selectionRef.current;
    const edit = editRef.current;
    setOcrBusy(true);
    setError(''); setResult(null); setStage('ocr'); setProgress(0);
    const workerJob = workerRef.current ??= import('tesseract.js').then(({ createWorker }) => createWorker('eng', 1, {
      workerPath: `${ASSET_BASE}tesseract/worker.min.js`,
      corePath: `${ASSET_BASE}tesseract/`,
      langPath: `${ASSET_BASE}tesseract`,
      logger: (message) => {
        if (message.status === 'recognizing text' && typeof message.progress === 'number') {
          setProgress(Math.round(message.progress * 100));
        }
      },
    }));
    try {
      const worker = await workerJob;
      if (selection !== selectionRef.current) return;
      const { data } = await worker.recognize(file);
      if (selection !== selectionRef.current) return;
      if (edit === editRef.current) setText(data.text.trim());
      setProgress(100);
      setStage('done');
      if (edit === editRef.current && !data.text.trim()) setError('No text could be read. Try a sharper screenshot or enter the text manually.');
    } catch (cause) {
      if (workerRef.current === workerJob) {
        workerRef.current = null;
        workerJob.then((worker) => worker.terminate()).catch(() => {});
      }
      if (selection === selectionRef.current) {
        setError(`OCR failed: ${cause?.message || 'unknown error'}. You can enter the text manually below.`);
        setStage('failed');
      }
    } finally {
      setOcrBusy(false);
    }
  };

  const analyzeText = async () => {
    if (!text.trim()) { setError('Enter or extract some text before analyzing.'); return; }
    const selection = selectionRef.current;
    const edit = editRef.current;
    setError(''); setResult(null); setStage('analyzing');
    try {
      const assessment = await engine.analyze(text);
      if (selection !== selectionRef.current) return;
      if (edit === editRef.current) setResult(assessment);
      setStage('done');
    } catch (cause) {
      if (selection !== selectionRef.current) return;
      if (edit === editRef.current) setError(cause?.message || 'Analysis could not be completed.');
      setStage('failed');
    }
  };

  return (
    <div>
      <SectionHeader
        eyebrow="SCREENSHOT SCANNER"
        title="Scan a campus screenshot"
        description="Upload an SMS, WhatsApp or email screenshot. OCR runs locally, and you can correct the text before analyzing it."
        action={<Badge tone="teal"><KeyRound size={13} /> Local OCR</Badge>}
      />

      <div className="analyzer-grid">
        <div className="analyzer-left">
          <Card className="panel">
            <div className="panel-head"><div><span className="panel-step">01</span><h2>Upload</h2></div>
              {file && <button className="btn btn-ghost btn-sm" onClick={() => { selectionRef.current += 1; setFile(null); setPreview(null); setText(''); setResult(null); setStage('idle'); if (inputRef.current) inputRef.current.value = ''; }}><X size={14} /> Remove</button>}
            </div>
            <label className={`dropzone ${file ? 'has-file' : ''}`} htmlFor="screenshot-input"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); chooseFile(e.dataTransfer.files?.[0]); }}>
              {preview ? <img className="preview-image" src={preview} alt="Uploaded screenshot preview" /> : (
                <div className="dropzone-inner"><ImageUp size={28} /><strong>Drop a screenshot here</strong><span>or click to choose a file</span><small>PNG, JPEG or WebP · up to {MAX_IMAGE_BYTES / 1024 / 1024} MB</small></div>
              )}
            </label>
            <input id="screenshot-input" ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="visually-hidden"
              onChange={(e) => chooseFile(e.target.files?.[0])} />
            {error && <div className="inline-error" role="alert"><CircleAlert size={15} />{error}</div>}
            <button className="btn btn-primary btn-wide" onClick={extractText} disabled={!file || ocrBusy || stage === 'analyzing'}>
              {stage === 'ocr' ? <><LoaderCircle size={17} className="spin" /> Reading screenshot…</> : <><ScanLine size={17} /> Extract text</>}
            </button>
            {(stage === 'ocr' || stage === 'done') && <ProgressBar value={progress} label="OCR progress" />}
            <p className="hint">The image is held in browser memory only and is never uploaded or stored.</p>
          </Card>

          <Card className="panel">
            <div className="panel-head"><div><span className="panel-step">02</span><h2>Text from image</h2></div>
              {text && <Badge tone="neutral">editable</Badge>}
            </div>
            <label className="field-label" htmlFor="ocr-text">Correct the extracted text if needed</label>
            <textarea id="ocr-text" className="message-input smaller" rows={8} value={text}
              placeholder="Extracted text will appear here. You can also paste text manually if OCR is unavailable."
              onChange={(e) => { editRef.current += 1; setText(e.target.value); setResult(null); }} />
            <button className="btn btn-secondary btn-wide" onClick={analyzeText} disabled={!text.trim() || ocrBusy || stage === 'analyzing'}>
              {stage === 'analyzing' ? <><LoaderCircle size={16} className="spin" /> Analyzing…</> : <>Analyze extracted text</>}
            </button>
            {result && <button className="btn btn-ghost btn-wide" onClick={() => onSendText(text)}>Open full analysis <ArrowRight size={15} /></button>}
          </Card>
        </div>

        <Card className="panel result-panel">
          <div className="panel-head"><div><span className="panel-step">03</span><h2>Assessment</h2></div></div>
          {result ? <ResultPanel result={result} compact /> : (
            <div className="screenshot-empty">
              <div className="empty-icon"><ScanLine size={26} /></div>
              <h3>From image to explanation</h3>
              <p>Upload a screenshot of a campus message, extract its text, correct OCR mistakes, then analyze it with the same student-focused engine.</p>
              <Alert tone="info">OCR recognises printed text best. Blurred screenshots, stylised fonts or regional scripts may need manual correction.</Alert>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
