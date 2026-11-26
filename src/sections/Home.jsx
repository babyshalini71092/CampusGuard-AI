import React from 'react';
import {
  ScanText, ImageUp, CreditCard, LifeBuoy, GraduationCap, ShieldCheck, LockKeyhole,
  ArrowRight, Cpu, FileSearch, ListChecks, EyeOff, Award, BellRing,
} from 'lucide-react';
import { Badge, Card } from '../components/UI.jsx';

const CAPABILITIES = [
  { id: 'analyzer', icon: ScanText, title: 'Scam Analyzer', text: 'Check an internship offer, scholarship message, placement alert or phishing SMS for warning signs.', tag: 'Message check' },
  { id: 'screenshot', icon: ImageUp, title: 'Screenshot Scanner', text: 'Read a screenshot locally, correct the OCR text, then analyze the message in seconds.', tag: 'Image check' },
  { id: 'payment', icon: CreditCard, title: 'Student Safety Assessment', text: 'Answer eight campus-specific questions before paying a fee or sharing a detail.', tag: 'Before you pay' },
  { id: 'recovery', icon: LifeBuoy, title: 'Recovery Assistant', text: 'Build a response checklist if you already paid, shared credentials or clicked a link.', tag: 'After an incident' },
  { id: 'simulation', icon: GraduationCap, title: 'Campus Scam Awareness', text: 'Practise realistic campus scenarios and learn the verification habit behind each one.', tag: 'Learn' },
];

const RISKS = [
  { icon: Award, label: 'Internship & placement fees' },
  { icon: BellRing, label: 'Fake scholarship notices' },
  { icon: FileSearch, label: 'College fee impersonation' },
  { icon: GraduationCap, label: 'Fake faculty messages' },
  { icon: Cpu, label: 'Technical event registrations' },
  { icon: LockKeyhole, label: 'Academic portal phishing' },
];

export default function Home({ onNavigate }) {
  return (
    <div className="home">
      <section className="hero campus-hero">
        <div className="hero-content">
          <Badge tone="teal" className="hero-badge"><span className="pulse-dot" /> Built for college students · private by design</Badge>
          <h1>Protect your campus journey.<br /><span>Verify opportunities before you trust them.</span></h1>
          <p className="hero-sub">CampusGuard AI helps you recognize fake internships, fraudulent scholarships, placement scams, college-fee impersonation, fake event registrations and phishing messages — before you click, pay or share anything.</p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => onNavigate('analyzer')}>Analyze a suspicious message <ArrowRight size={17} /></button>
            <button className="btn btn-secondary" onClick={() => onNavigate('payment')}>Run student safety check</button>
          </div>
          <div className="hero-trust">
            <span><LockKeyhole size={15} /> No account</span>
            <span><EyeOff size={15} /> No message uploads</span>
            <span><Cpu size={15} /> On-device model</span>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="visual-frame">
            <div className="visual-top"><span className="dot red" /><span className="dot amber" /><span className="dot green" /><span className="visual-title">scan://campus-message</span></div>
            <div className="visual-body">
              <div className="visual-line muted">FROM · "placement-team" · unknown number</div>
              <div className="visual-line">"Congratulations! Your internship is confirmed. Pay ₹1,500 registration fee today to receive the offer letter."</div>
              <div className="visual-signal"><span>Internship registration fee</span><b>+32</b></div>
              <div className="visual-signal"><span>Placement offer + urgency</span><b>+18</b></div>
              <div className="visual-verdict"><span>Warning-sign score</span><strong>60<span>/100</span></strong></div>
              <div className="visual-note">Rule-based illustration · verify with the placement cell</div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <div><p className="eyebrow">WHAT YOU CAN DO</p><h2>Five ways to stay ahead of a campus scam</h2></div>
          <p>From the first suspicious message to the moment you need help — every tool runs locally.</p>
        </div>
        <div className="capability-grid">
          {CAPABILITIES.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" className="capability-card" onClick={() => onNavigate(item.id)}>
                <span className="capability-top"><span className="capability-icon"><Icon size={21} strokeWidth={1.8} /></span><span className="capability-tag">{item.tag}</span></span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span className="capability-link">Open <ArrowRight size={14} /></span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="home-section risk-section">
        <div className="home-section-head">
          <div><p className="eyebrow">CAMPUS-SPECIFIC THREATS</p><h2>What students are being targeted with</h2></div>
          <p>These are the situations the checks are designed around — not generic "bank fraud" language.</p>
        </div>
        <div className="risk-grid">
          {RISKS.map(({ icon: Icon, label }) => (
            <div className="risk-item" key={label}><Icon size={17} strokeWidth={1.8} /><span>{label}</span></div>
          ))}
        </div>
      </section>

      <section className="home-section pipeline-section">
        <div className="home-section-head">
          <div><p className="eyebrow">HOW AN ASSESSMENT WORKS</p><h2>Three signals, one explainable result</h2></div>
          <p>You see which indicators fired, what the semantic model compared, and how the score was built.</p>
        </div>
        <div className="pipeline-grid">
          <Card className="pipeline-card">
            <span className="pipeline-index">01</span>
            <ListChecks size={22} />
            <h3>Campus indicators</h3>
            <p>Rules look for concrete asks — a registration fee, a "confirm your portal password" link, a faculty impersonation, a deadline tied to payment — not innocent words like "college" or "internship".</p>
          </Card>
          <Card className="pipeline-card">
            <span className="pipeline-index">02</span>
            <FileSearch size={22} />
            <h3>Semantic similarity</h3>
            <p>A small pretrained MiniLM model compares meaning against authored student messages: suspicious and legitimate. It is one signal, never the whole verdict.</p>
          </Card>
          <Card className="pipeline-card">
            <span className="pipeline-index">03</span>
            <ShieldCheck size={22} />
            <h3>Clear next steps</h3>
            <p>You get a warning-sign score, possible category, verification steps and explicit uncertainty. A low score is never presented as proof that a message is safe.</p>
          </Card>
        </div>
      </section>

      <section className="privacy-strip">
        <div><LockKeyhole size={22} /><div><h3>Your messages stay on your device</h3><p>Text analysis, OCR and semantic inference run in this browser tab. There is no server-side analysis, no history database and no account to create.</p></div></div>
        <button className="btn btn-ghost" onClick={() => onNavigate('privacy')}>Read the method <ArrowRight size={15} /></button>
      </section>
    </div>
  );
}
