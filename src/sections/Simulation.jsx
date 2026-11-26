import React, { useState } from 'react';
import { GraduationCap, RotateCcw, Check, X, Lightbulb, ArrowRight } from 'lucide-react';
import { SectionHeader, Card, Badge, ProgressBar, Alert } from '../components/UI.jsx';
import { SCENARIOS, evaluateChoice } from '../engine/simulation.js';

export default function Simulation() {
  const [active, setActive] = useState(0);
  const [responses, setResponses] = useState({});
  const scenario = SCENARIOS[active];
  const response = responses[scenario.id];
  const answeredCount = Object.keys(responses).length;
  const safeCount = Object.values(responses).filter((r) => r.safe).length;
  const choose = (optionId) => {
    if (response) return;
    setResponses((prev) => ({ ...prev, [scenario.id]: evaluateChoice(scenario, optionId) }));
  };

  return (
    <div>
      <SectionHeader
        eyebrow="CAMPUS SCAM AWARENESS"
        title="Practise the verification habit"
        description="Work through realistic campus scams — internships, scholarships, fake faculty, events and portals — and learn one verification technique from each."
        action={<Badge tone="teal"><GraduationCap size={13} /> {safeCount}/{SCENARIOS.length} sound choices</Badge>}
      />

      <Card className="panel">
        <div className="tabs" role="tablist" aria-label="Scenarios">
          {SCENARIOS.map((item, index) => (
            <button key={item.id} role="tab" aria-selected={active === index} className={`tab ${active === index ? 'active' : ''}`} onClick={() => setActive(index)}>
              <span>{index + 1}</span>{item.title}
              {responses[item.id] && <Check size={14} className={responses[item.id].safe ? 'icon-success' : 'icon-danger'} />}
            </button>
          ))}
        </div>
        <ProgressBar value={(answeredCount / SCENARIOS.length) * 100} label={`${answeredCount} of ${SCENARIOS.length} completed`} />
      </Card>

      <div className="simulation-grid">
        <Card className="panel">
          <div className="panel-head"><div><span className="panel-step">SCENARIO {active + 1}</span><h2>{scenario.title}</h2></div><Badge tone="neutral">{scenario.category}</Badge></div>
          <div className="scenario-context"><span>The situation</span><p>{scenario.context}</p></div>
          <p className="mini-title">What would you do?</p>
          <div className="option-list">
            {scenario.options.map((option) => {
              const selected = response?.id === option.id;
              return (
                <button key={option.id} className={`option ${selected ? `option-${option.outcome}` : ''} ${response && !selected ? 'option-dimmed' : ''}`}
                  onClick={() => choose(option.id)} disabled={Boolean(response)}>
                  <span>{option.label}</span>
                  {selected && (option.safe ? <Check size={17} /> : <X size={17} />)}
                </button>
              );
            })}
          </div>
          {response && (
            <Alert tone={response.safe ? 'success' : 'danger'}>
              {response.safe ? <Check size={16} /> : <X size={16} />}
              <span><strong>{response.safe ? 'Sound choice.' : 'Risky choice.'}</strong> {response.explanation}</span>
            </Alert>
          )}
        </Card>

        <Card className="panel">
          <div className="panel-head"><div><span className="panel-step">THE TAKEAWAY</span><h2>Verification technique</h2></div></div>
          <div className="technique-box"><Lightbulb size={22} /><p>{response ? scenario.technique : 'Choose a response to reveal the technique for this scenario.'}</p></div>
          {response && (
            <button className="btn btn-secondary" onClick={() => setActive((active + 1) % SCENARIOS.length)}>
              Next scenario <ArrowRight size={16} />
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => setResponses({})} disabled={answeredCount === 0}><RotateCcw size={15} /> Restart practice</button>
          <div className="progress-note">
            <strong>{answeredCount} of {SCENARIOS.length} scenarios attempted</strong>
            <p>Progress is held in this tab only. Refreshing the page starts a new session.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
