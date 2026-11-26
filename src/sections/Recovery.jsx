import React, { useMemo, useState } from 'react';
import { LifeBuoy, ExternalLink, Phone, CheckCircle2, CircleAlert, RotateCcw } from 'lucide-react';
import { SectionHeader, Card, Badge, ToggleGroup, Alert } from '../components/UI.jsx';
import { INCIDENT_QUESTIONS, generateRecoveryPlan } from '../engine/recovery.js';

export default function Recovery() {
  const [answers, setAnswers] = useState({});
  const [completed, setCompleted] = useState({});
  const plan = useMemo(() => generateRecoveryPlan(answers), [answers]);
  const setAnswer = (id, value) => setAnswers((prev) => ({ ...prev, [id]: value }));
  const groups = [...new Set(plan.steps.map((s) => s.group))];

  return (
    <div>
      <SectionHeader
        eyebrow="CAMPUS RECOVERY ASSISTANT"
        title="If you already paid or shared, start here"
        description="Tell us what happened and get a student-specific response checklist, including campus contacts. Nothing you enter here is sent anywhere."
        action={<Badge tone="warning"><LifeBuoy size={13} /> Incident response</Badge>}
      />

      <Alert tone="danger"><CircleAlert size={16} /> <span><strong>If a transfer was just made:</strong> call your bank's official helpline immediately and report online financial fraud at <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer">cybercrime.gov.in</a> or the cybercrime helpline <strong>1930</strong>. Fast action can help; it cannot guarantee recovery.</span></Alert>

      <div className="recovery-grid">
        <Card className="panel">
          <div className="panel-head"><div><span className="panel-step">01</span><h2>What happened?</h2></div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAnswers({}); setCompleted({}); }} disabled={plan.selected.length === 0}><RotateCcw size={14} /> Reset</button>
          </div>
          <div className="question-list">
            {INCIDENT_QUESTIONS.map((question, index) => (
              <div className="question-card" key={question.id}>
                <div className="question-top">
                  <span className="question-index">{String(index + 1).padStart(2, '0')}</span>
                  <div><p className="question-text">{question.prompt}</p><p className="question-hint">{question.hint}</p></div>
                </div>
                <ToggleGroup id={`incident-${question.id}`} name={question.prompt} value={answers[question.id]}
                  onChange={(value) => setAnswer(question.id, value)} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="panel">
          <div className="panel-head"><div><span className="panel-step">02</span><h2>Your response plan</h2></div>
            {plan.selected.length > 0 && <Badge tone={plan.urgent ? 'danger' : 'teal'}>{plan.steps.length} steps</Badge>}
          </div>
          <p className="plan-headline">{plan.headline}</p>
          {plan.selected.length === 0 ? (
            <div className="skeleton-stack"><div className="skeleton" /><div className="skeleton short" /><div className="skeleton" /></div>
          ) : (
            <>
              {groups.map((group) => (
                <section className="plan-group" key={group}>
                  <h3>{group}</h3>
                  {plan.steps.filter((step) => step.group === group).map((step) => (
                    <label className={`plan-step ${completed[step.id] ? 'done' : ''}`} key={step.id}>
                      <input type="checkbox" checked={Boolean(completed[step.id])} onChange={(e) => setCompleted((prev) => ({ ...prev, [step.id]: e.target.checked }))} />
                      <span className="plan-step-body">
                        <span className="plan-step-title"><CheckCircle2 size={15} /> {step.title}{step.relevant && <em>based on your answers</em>}</span>
                        <span className="plan-step-detail">{step.detail}</span>
                        {step.url && <a href={step.url} target="_blank" rel="noopener noreferrer" className="plan-link" onClick={(e) => e.stopPropagation()}>Open official portal <ExternalLink size={13} /></a>}
                      </span>
                    </label>
                  ))}
                </section>
              ))}
              <div className="official-box">
                <div><Phone size={18} /><div><strong>Cybercrime helpline</strong><span>1930 · India</span></div></div>
                <a className="btn btn-secondary btn-sm" href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer">Report online <ExternalLink size={14} /></a>
              </div>
            </>
          )}
          <p className="hint">{plan.disclaimer}</p>
        </Card>
      </div>
    </div>
  );
}
