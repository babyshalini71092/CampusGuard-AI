import React, { useMemo, useState } from 'react';
import { CreditCard, RefreshCcw, ShieldAlert, CheckCircle2, Ban, ClipboardCheck } from 'lucide-react';
import { SectionHeader, Card, Badge, Gauge, ProgressBar, ToggleGroup, Alert } from '../components/UI.jsx';
import { PAYMENT_QUESTIONS, computePaymentAssessment } from '../engine/payment.js';

const TIER_TONE = { stop: 'danger', pause: 'warning', review: 'warning', careful: 'success', incomplete: 'neutral' };

export default function Payment() {
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState({});
  const assessment = useMemo(() => computePaymentAssessment(answers), [answers]);
  const setAnswer = (id, value) => setAnswers((prev) => ({ ...prev, [id]: value }));
  const reset = () => { setAnswers({}); setChecked({}); };

  return (
    <div>
      <SectionHeader
        eyebrow="STUDENT SAFETY ASSESSMENT"
        title="Check the request before you pay"
        description="Eight short questions about internships, scholarships, placements, events and hostel payments. The result updates as you answer — no credentials or payment details are collected."
        action={<Badge tone="teal"><ShieldAlert size={13} /> Decision support only</Badge>}
      />

      <div className="payment-grid">
        <div>
          <Card className="panel">
            <div className="panel-head">
              <div><span className="panel-step">01</span><h2>Answer honestly</h2></div>
              <button className="btn btn-ghost btn-sm" onClick={reset} disabled={assessment.answered === 0}><RefreshCcw size={14} /> Reset</button>
            </div>
            <ProgressBar value={assessment.progress} label={`${assessment.answered} of ${PAYMENT_QUESTIONS.length} answered`} />
            <div className="question-list">
              {PAYMENT_QUESTIONS.map((question, index) => (
                <div className="question-card" key={question.id}>
                  <div className="question-top">
                    <span className="question-index">{String(index + 1).padStart(2, '0')}</span>
                    <div><p className="question-text">{question.prompt}</p><p className="question-hint">{question.hint}</p></div>
                  </div>
                  <ToggleGroup id={question.id} name={question.prompt} value={answers[question.id]}
                    onChange={(value) => setAnswer(question.id, value)} />
                </div>
              ))}
            </div>
            <Alert tone="info">Never enter an OTP, UPI PIN, password, card number or account number anywhere in this tool.</Alert>
          </Card>
        </div>

        <div className="payment-summary">
          <Card className="panel sticky-panel">
            <div className="panel-head"><div><span className="panel-step">02</span><h2>Live assessment</h2></div><Badge tone={TIER_TONE[assessment.tier]}>{assessment.tier}</Badge></div>
            <div className="payment-gauge-row">
              <Gauge score={assessment.score} level={assessment.tier === 'stop' ? 'high' : assessment.tier === 'pause' || assessment.tier === 'review' ? 'elevated' : 'low'} size={140} label="Risk flags" />
              <div><h3 className={`tier-title tier-${assessment.tier}`}>{assessment.recommendation.title}</h3><p className="muted-copy">{assessment.recommendation.body}</p></div>
            </div>

            {assessment.findings.length > 0 && (
              <div className="summary-block">
                <h4><ShieldAlert size={15} /> Warning signs from your answers</h4>
                <ul className="finding-list">{assessment.findings.map((f) => <li key={f.id}>{f.prompt}<span className="tabular">+{f.weight}</span></li>)}</ul>
              </div>
            )}

            {assessment.verify.length > 0 && (
              <div className="summary-block">
                <h4><ClipboardCheck size={15} /> Verify before paying</h4>
                <ul className="check-list">{assessment.verify.map((v) => <li key={v}>{v}</li>)}</ul>
              </div>
            )}
            {assessment.avoid.length > 0 && (
              <div className="summary-block avoid-block">
                <h4><Ban size={15} /> Do not do this</h4>
                <ul className="check-list">{assessment.avoid.map((v) => <li key={v}>{v}</li>)}</ul>
              </div>
            )}

            <div className="summary-block">
              <h4><CheckCircle2 size={15} /> Your safety checklist</h4>
              {assessment.checklist.map((item) => (
                <label className="check-row" key={item}>
                  <input type="checkbox" checked={Boolean(checked[item])} onChange={(e) => setChecked((prev) => ({ ...prev, [item]: e.target.checked }))} />
                  <span>{item}</span>
                </label>
              ))}
            </div>
            <p className="hint">{assessment.disclaimer}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
