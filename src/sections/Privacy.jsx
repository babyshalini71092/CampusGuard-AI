import React from 'react';
import { LockKeyhole, Cpu, Scale, CircleAlert, FileText, ShieldCheck } from 'lucide-react';
import { SectionHeader, Card, Badge } from '../components/UI.jsx';
import { MODEL_ID, MODEL_REVISION, MODEL_VARIANT } from '../engine/embeddings.js';

export default function Privacy() {
  return (
    <div>
      <SectionHeader
        eyebrow="PRIVACY & METHODOLOGY"
        title="How this works, and where it stops"
        description="Plain-language documentation of the student-message data flow, the pretrained model, the score formula and the limits of the assessment."
        action={<Badge tone="teal"><LockKeyhole size={13} /> Browser-local</Badge>}
      />

      <div className="method-grid">
        <Card className="panel method-card">
          <div className="method-icon"><LockKeyhole size={21} /></div>
          <h2>Privacy architecture</h2>
          <ul>
            <li>Message text, screenshots, questionnaire answers and OCR results are processed in this browser tab only.</li>
            <li>There is no application server for analysis, no account, no analytics and no message log.</li>
            <li>The pretrained model, its ONNX runtime files and OCR language data are served as static files from this app.</li>
            <li>Links found in messages are inspected as strings. They are never opened, resolved or fetched.</li>
            <li>Nothing is saved to localStorage or IndexedDB. Closing the tab clears the session.</li>
          </ul>
          <p className="hint">Browser caching of static assets is controlled by your browser. This does not include your message content.</p>
        </Card>

        <Card className="panel method-card">
          <div className="method-icon"><Cpu size={21} /></div>
          <h2>The pretrained model</h2>
          <ul>
            <li><strong>Identifier:</strong> {MODEL_ID}</li>
            <li><strong>Revision:</strong> <code>{MODEL_REVISION}</code></li>
            <li><strong>Distribution:</strong> {MODEL_VARIANT}</li>
            <li><strong>License:</strong> Apache-2.0 (sentence-transformers/all-MiniLM-L6-v2 and Xenova ONNX conversion).</li>
            <li><strong>Role:</strong> converts text into 384-dimensional embeddings. Cosine similarity against an authored reference set becomes one heuristic signal.</li>
          </ul>
          <p className="hint">This is <strong>not</strong> a fraud classifier and has not been fine-tuned. It was chosen because it is small, Apache-2.0 licensed, browser-compatible and adequate for semantic similarity on an ordinary laptop.</p>
        </Card>

        <Card className="panel method-card">
          <div className="method-icon"><Scale size={21} /></div>
          <h2>Transparent scoring</h2>
          <ul>
            <li>Indicator rules contribute 55%, link lexical findings 25% and semantic similarity 20% when the model is ready and its evidence is strong enough.</li>
            <li>Semantic reliability scales with the closest reference similarity; weak evidence is removed and its weight redistributed. The interface always shows the effective weights.</li>
            <li>A single high-confidence indicator (weight 27+) raises the score to at least 45 so a strong signal cannot disappear in the average; the interface shows when this floor is applied.</li>
            <li>Explicit safety language subtracts a small amount. Negated phrases are suppressed rather than counted as attacks.</li>
            <li>Concern bands: 0–17 few signs, 18–39 moderate, 40–69 elevated, 70–100 high.</li>
          </ul>
          <p className="hint">The result is a warning-sign score on an arbitrary 0–100 scale. It is not a probability, not calibrated, and not validated for production use.</p>
        </Card>

        <Card className="panel method-card">
          <div className="method-icon"><CircleAlert size={21} /></div>
          <h2>Known limitations</h2>
          <ul>
            <li>Reference examples are authored, small and illustrative; they are not a representative dataset.</li>
            <li>Novelty, unusual languages, satire and screenshots with poor OCR quality can defeat the checks.</li>
            <li>Rules can produce false positives and false negatives. Legitimate messages can resemble scams.</li>
            <li>URL checks are lexical only. A clean-looking link is not evidence that a site is trustworthy.</li>
            <li>The payment and recovery checklists are decision support, not verification of a person, organisation or transaction.</li>
          </ul>
          <p className="hint">Never rely on a low score as proof that a request is safe.</p>
        </Card>
      </div>

      <Card className="panel docs-card">
        <div className="docs-head"><FileText size={20} /><h2>Project documentation</h2></div>
        <div className="docs-grid">
          <a href="/docs/README.md" target="_blank" rel="noopener noreferrer"><span>README.md</span><small>Setup, commands, architecture</small></a>
          <a href="/docs/MODEL_CARD.md" target="_blank" rel="noopener noreferrer"><span>MODEL_CARD.md</span><small>Model provenance and use</small></a>
          <a href="/docs/SECURITY.md" target="_blank" rel="noopener noreferrer"><span>SECURITY.md</span><small>Threat model and safeguards</small></a>
          <a href="/docs/COMPARISON.md" target="_blank" rel="noopener noreferrer"><span>COMPARISON.md</span><small>Differences from Campus Fraud Shield</small></a>
          <a href="/docs/EVALUATION.md" target="_blank" rel="noopener noreferrer"><span>EVALUATION.md</span><small>Measured test results</small></a>
        </div>
      </Card>

      <div className="privacy-closing"><ShieldCheck size={20} /><p>Stay informed. Stay secure. Stay connected. No tool replaces that final independent check.</p></div>
    </div>
  );
}
