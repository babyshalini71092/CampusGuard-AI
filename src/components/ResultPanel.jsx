import React from 'react';
import { AlertTriangle, ShieldAlert, CircleHelp, CheckCircle2, Download, Info, Link2, Sparkles, ListChecks } from 'lucide-react';
import { Badge, Gauge, ScoreBreakdown, Alert } from './UI.jsx';
import { escapeForReport } from '../engine/validate.js';
import { REFERENCE_MESSAGES } from '../engine/references.js';

const LEVEL_COPY = {
  high: { label: 'High concern', tone: 'danger' },
  elevated: { label: 'Elevated concern', tone: 'warning' },
  moderate: { label: 'Moderate concern', tone: 'warning' },
  low: { label: 'Few warning signs', tone: 'success' },
};

function downloadReport(result) {
  const lines = [
    'CAMPUSGUARD AI · SANITIZED CAMPUS SAFETY REPORT',
    `Generated: ${new Date().toISOString()}`,
    `Warning-sign score: ${result.score}/100 (${LEVEL_COPY[result.level].label})`,
    `Possible category: ${result.categoryLabel || 'Not identified'}`,
    `Uncertainty: ${result.uncertaintyReason || 'No additional uncertainty flag'}`,
    `Semantic inference: ${result.semantic ? 'executed' : 'not executed'}`, `Semantic evidence contributed: ${result.semanticUsed ? 'yes' : 'no'}`, `Assessment mode: ${result.semanticUsed ? 'hybrid' : 'rule-based fallback'}`,
    '',
    'Detected indicators:',
    ...(result.indicators.length ? result.indicators.map((i) => `- ${i.label} (${i.weight} pts): ${i.evidence}. ${i.detail}`) : ['- none detected']),
    '',
    'Link structure findings:',
    ...(result.urlFindings.length ? result.urlFindings.map((i) => `- ${i.label}: ${i.detail}`) : ['- none detected']),
    '',
    'Safety language (sender and destination unverified):',
    ...(result.safetySignals.length ? result.safetySignals.map((signal) => `- ${signal.detail}`) : ['- none detected']),
    '',
    'Recommended next steps:',
    ...result.steps.map((s) => `- ${s}`),
    '',
    'Limitations:',
    result.limitations,
    '',
    'Note: message text is deliberately excluded from this report.',
  ];
  const blob = new Blob([escapeForReport(lines.join('\n'))], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'campusguard-report.txt'; a.click();
  URL.revokeObjectURL(url);
}

export default React.memo(function ResultPanel({ result, compact = false }) {
  if (!result) return null;
  const level = LEVEL_COPY[result.level];
  const semanticLabel = result.semanticUsed ? 'ML evidence used' : (result.semantic ? 'ML inconclusive' : 'Rules only');
  return (
    <div className="result-stack">
      <div className="result-summary">
        <Gauge score={result.score} level={result.level} size={compact ? 132 : 168} />
        <div className="result-summary-copy">
          <Badge tone={level.tone}><span className="badge-dot" />{level.label}</Badge>
          <h2>{result.categoryLabel || 'No clear scam pattern identified'}</h2>
          <p>{result.level === 'low'
            ? 'These checks found few warning signs. That is not proof the message is safe — verify the request through a channel you already trust.'
            : 'Several signals point to a pattern worth checking. Do not act on the message until you have verified the request independently.'}</p>
          <div className="result-meta">
            <span><ListChecks size={14} /> {result.indicators.length} indicators</span>
            <span><Link2 size={14} /> {result.urlFindings.length} link findings</span>
            <span><Sparkles size={14} /> {semanticLabel}</span>
          </div>
        </div>
      </div>

      {result.uncertain && (
        <Alert tone="warning"><CircleHelp size={16} /> <span><strong>Uncertain result.</strong> {result.uncertaintyReason} Verify through a known campus channel before acting.</span></Alert>
      )}

      {!compact && (
        <>
          <ScoreBreakdown aggregation={result.aggregation} semanticUsed={result.semanticUsed} />

          <section className="result-block">
            <h3><ShieldAlert size={17} /> Detected suspicious phrases</h3>
            {result.indicators.length === 0 ? (
              <p className="muted-copy">No specific suspicious phrase was matched. New or indirect wording can still be risky.</p>
            ) : (
              <div className="indicator-list">
                {result.indicators.map((indicator) => (
                  <div className="indicator" key={indicator.id}>
                    <div className="indicator-head"><strong>{indicator.label}</strong><span className="tabular">+{indicator.weight}</span></div>
                    {indicator.evidence && <q>{indicator.evidence}</q>}
                    <p>{indicator.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {result.safetySignals.length > 0 && (
            <section className="result-block">
              <h3><CheckCircle2 size={17} /> Safety language detected</h3>
              <p className="hint">These are wording cues. The sender and payment destination still need independent verification.</p>
              <div className="safety-list">
                {result.safetySignals.map((s) => <div key={s.id}><CheckCircle2 size={15} /><span>{s.detail}</span><span className="tabular">−{s.points}</span></div>)}
              </div>
            </section>
          )}

          {result.urlFindings.length > 0 && (
            <section className="result-block">
              <h3><Link2 size={17} /> Link structure (inspected as text only)</h3>
              <div className="url-list">
                {result.urlFindings.map((f, index) => (
                  <div key={`${f.url}-${index}`}><code>{f.url}</code><strong>{f.label}</strong><p>{f.detail}</p></div>
                ))}
              </div>
              <p className="hint">CampusGuard AI does not open or visit these links.</p>
            </section>
          )}

          {result.semantic && (
            <section className="result-block">
              <h3><Sparkles size={17} /> Semantic similarity</h3>
              <div className="semantic-status">
                <Badge tone="teal">Model initialized · inference executed</Badge>
                <Badge tone={result.semanticUsed ? 'success' : 'warning'}>{result.semanticUsed ? 'Evidence contributed to score' : 'Evidence inconclusive · excluded from score'}</Badge>
              </div>
              <div className="semantic-grid">
                <div><span>Suspicious examples</span><strong className="tabular">{result.semantic.suspiciousMean.toFixed(2)}</strong></div>
                <div><span>Legitimate examples</span><strong className="tabular">{result.semantic.legitimateMean.toFixed(2)}</strong></div>
                <div><span>Margin</span><strong className="tabular">{result.semantic.gap > 0 ? '+' : ''}{result.semantic.gap.toFixed(2)}</strong></div>
              </div>
              <p className="muted-copy">
                {result.semanticUsed
                  ? `Pretrained MiniLM embeddings compared this message with ${REFERENCE_MESSAGES.length} authored student references (${REFERENCE_MESSAGES.filter((r) => r.label === 'suspicious').length} suspicious, ${REFERENCE_MESSAGES.filter((r) => r.label === 'legitimate').length} legitimate). The nearest example was ${result.semantic.nearest[0].label} (cosine ${result.semantic.nearest[0].similarity}).`
                  : 'The similarity margin was too weak to be reliable, so semantic evidence was excluded. Rules and link structure alone produced this score.'}
              </p>
            </section>
          )}
        </>
      )}

      <section className="result-block steps-block">
        <h3><AlertTriangle size={17} /> Recommended next steps</h3>
        <ol>{result.steps.map((step) => <li key={step}>{step}</li>)}</ol>
      </section>

      <div className="result-footer">
        <p><Info size={15} /> {result.limitations}</p>
        <button className="btn btn-ghost btn-sm" onClick={() => downloadReport(result)}><Download size={15} /> Download report</button>
      </div>
    </div>
  );
});
