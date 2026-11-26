import React, { useState } from 'react';
import { GraduationCap, Menu, X, ScanText, ImageUp, CreditCard, LifeBuoy, BookOpen, ShieldCheck } from 'lucide-react';
import { SECTIONS, Logo } from './components/UI.jsx';
import Home from './sections/Home.jsx';
import Analyzer from './sections/Analyzer.jsx';
import Screenshot from './sections/Screenshot.jsx';
import Payment from './sections/Payment.jsx';
import Recovery from './sections/Recovery.jsx';
import Simulation from './sections/Simulation.jsx';
import Privacy from './sections/Privacy.jsx';
import { useAnalysisEngine } from './useAnalysisEngine.js';

const ICONS = {
  home: GraduationCap,
  analyzer: ScanText,
  screenshot: ImageUp,
  payment: CreditCard,
  recovery: LifeBuoy,
  simulation: BookOpen,
  privacy: ShieldCheck,
};

export default function App() {
  const [section, setSection] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [handoff, setHandoff] = useState(null);
  const engine = useAnalysisEngine();

  const navigate = (id) => {
    setSection(id);
    setMenuOpen(false);
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };
  const sendToAnalyzer = (text) => {
    setHandoff({ text, nonce: Date.now() });
    navigate('analyzer');
  };

  const modelTone = { ready: 'ready', loading: 'loading', unavailable: 'unavailable' }[engine.model.status] || 'idle';
  const current = SECTIONS.find((s) => s.id === section) || SECTIONS[0];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand"><Logo /><button className="mobile-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={20} /></button></div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <p className="nav-label">CAMPUS SAFETY</p>
          {SECTIONS.map((item) => {
            const Icon = ICONS[item.id] || ShieldCheck;
            return (
              <button key={item.id} className={`nav-item ${section === item.id ? 'active' : ''}`} aria-current={section === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}>
                <Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="privacy-chip"><span className="chip-dot" /><div><strong>Private by design</strong><small>Processing stays on this device</small></div></div>
          <p>CampusGuard AI · student edition · v1.0</p>
        </div>
      </aside>

      {menuOpen && <button className="sidebar-backdrop" aria-label="Dismiss navigation overlay" onClick={() => setMenuOpen(false)} />}

      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
          <div className="topbar-location"><span>CampusGuard AI</span><span className="crumb-sep">/</span><strong>{current.label}</strong></div>
          <div className="topbar-right">
            <button className="model-pill" onClick={() => navigate('privacy')} title="View model methodology">
              <span className={`status-dot status-${modelTone}`} />
              <span>{engine.model.status === 'ready' ? 'ML ready' : engine.model.status === 'loading' ? 'ML loading' : engine.model.status === 'unavailable' ? 'Rules only' : 'ML off'}</span>
            </button>
            <span className="avatar" aria-hidden="true">CG</span>
          </div>
        </header>

        <main className="content">
          {section === 'home' && <Home onNavigate={navigate} />}
          {section === 'analyzer' && <Analyzer engine={engine} handoff={handoff} />}
          {section === 'screenshot' && <Screenshot engine={engine} onSendText={sendToAnalyzer} />}
          {section === 'payment' && <Payment />}
          {section === 'recovery' && <Recovery />}
          {section === 'simulation' && <Simulation />}
          {section === 'privacy' && <Privacy />}
        </main>

        <footer className="app-footer">
          <span>Stay informed. Stay secure. Stay connected.</span>
          <span>Educational tool for students · heuristic assessment · not a guarantee</span>
        </footer>
      </div>
    </div>
  );
}
