import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const SECTIONS = [
  { id: 'home', label: 'Overview', short: 'Overview' },
  { id: 'analyzer', label: 'Scam Analyzer', short: 'Analyze' },
  { id: 'screenshot', label: 'Screenshot Scanner', short: 'Screenshots' },
  { id: 'payment', label: 'Student Safety Assessment', short: 'Safety check' },
  { id: 'recovery', label: 'Recovery Assistant', short: 'Recovery' },
  { id: 'simulation', label: 'Campus Scam Awareness', short: 'Awareness' },
  { id: 'privacy', label: 'Privacy & Method', short: 'Method' },
];

export function Logo({ compact = false }) {
  return (
    <div className={`logo ${compact ? 'logo-compact' : ''}`}>
      <span className="logo-mark" aria-hidden="true"><ShieldCheck size={20} strokeWidth={2.2} /></span>
      <span className="logo-text">CampusGuard <span>AI</span></span>
    </div>
  );
}

export function Badge({ tone = 'neutral', children, ...rest }) {
  return <span className={`badge badge-${tone}`} {...rest}>{children}</span>;
}

export function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <header className="section-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="section-description">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({ children, className = '', ...rest }) {
  return <div className={`card ${className}`} {...rest}>{children}</div>;
}

export function Gauge({ score, level = 'low', size = 168, label = 'Warning sign score' }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(100, Math.max(0, score)) / 100) * circumference;
  return (
    <div className="gauge" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${score} out of 100`}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} className="gauge-track" strokeWidth="11" fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          className={`gauge-value gauge-${level}`} strokeWidth="11" fill="none"
          strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="gauge-center">
        <strong>{score}</strong>
        <span>/ 100</span>
        <small>{label}</small>
      </div>
    </div>
  );
}

export function ToggleGroup({ value, onChange, id, name }) {
  return (
    <div className="toggle-group" role="group" aria-label={name}>
      {[true, false].map((option) => (
        <button
          key={String(option)}
          type="button"
          className={`toggle-option ${value === option ? 'selected' : ''}`}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          id={`${id}-${option ? 'yes' : 'no'}`}
        >
          {option ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({ value, label }) {
  if (value === undefined) {
    return (
      <div className="progress-wrap" role="progressbar" aria-label={label}>
        <div className="progress-label">{label}</div>
        <div className="progress-track"><div className="progress-fill progress-indeterminate" /></div>
      </div>
    );
  }
  return (
    <div className="progress-wrap">
      {label && <div className="progress-label"><span>{label}</span><span>{Math.round(value)}%</span></div>}
      <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={26} strokeWidth={1.7} /></div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export function Alert({ tone = 'info', children }) {
  return <div className={`alert alert-${tone}`} role="status">{children}</div>;
}

export function ScoreBreakdown({ aggregation, semanticUsed }) {
  const rows = [
    { key: 'rules', label: 'Detected indicators', weight: aggregation.weights.rules, contribution: aggregation.contributions.rules },
    { key: 'url', label: 'Link structure', weight: aggregation.weights.url, contribution: aggregation.contributions.url },
    { key: 'semantic', label: 'Semantic similarity', weight: aggregation.weights.semantic, contribution: aggregation.contributions.semantic },
  ];
  return (
    <div className="breakdown">
      <p className="mini-title">How the score was built</p>
      {rows.map((row) => (
        <div className="breakdown-row" key={row.key}>
          <span>{row.label}</span>
          <span className="tabular">{Math.round(row.weight * 100)}% weight</span>
          <strong className="tabular">+{row.contribution}</strong>
        </div>
      ))}
      {aggregation.floorApplied && <p className="hint">Strong-indicator floor applied: “{aggregation.floorApplied.trigger}” raised the score from {aggregation.floorApplied.from} to {aggregation.floorApplied.to}.</p>}
      {!semanticUsed && <p className="hint">Semantic similarity contributed 0: the model was not ready or its evidence was too weak.</p>}
      <p className="formula">warning score = Σ (component score × effective weight), rounded and capped at 100.</p>
    </div>
  );
}
