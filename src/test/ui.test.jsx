import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, within, waitFor, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import Analyzer from '../sections/Analyzer.jsx';
import Screenshot from '../sections/Screenshot.jsx';
import Payment from '../sections/Payment.jsx';
import Recovery from '../sections/Recovery.jsx';
import Simulation from '../sections/Simulation.jsx';
import { analyzeMessage } from '../engine/analysis.js';

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(async () => ({
    recognize: vi.fn(async () => ({ data: { text: 'You won Rs 25000 lottery. Share your OTP to claim the prize.' } })),
    terminate: vi.fn(async () => {}),
  })),
}));

beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => 'blob:preview');
  global.URL.revokeObjectURL = vi.fn();
});

afterEach(cleanup);

const fakeEngine = (overrides = {}) => ({
  model: { status: 'not-initialized', progress: 0, error: null },
  loadModel: vi.fn(async () => true),
  analyze: vi.fn(async (text) => analyzeMessage(text)),
  ...overrides,
});

describe('application navigation', () => {
  it('renders every section from the sidebar without placeholder content', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('heading', { name: /Protect your campus journey/i })).toBeInTheDocument();
    for (const label of ['Scam Analyzer', 'Screenshot Scanner', 'Student Safety Assessment', 'Recovery Assistant', 'Campus Scam Awareness', 'Privacy & Method']) {
      await user.click(screen.getByRole('button', { name: label }));
      expect(screen.queryByText(/Placeholder|Coming soon/i)).not.toBeInTheDocument();
    }
    expect(screen.getByText(/warning-sign score/i)).toBeInTheDocument();
  });
  it('exposes a working mobile navigation toggle', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('button', { name: 'Close navigation' })).toBeInTheDocument();
  });
});

describe('message analyzer integration', () => {
  it('submits a sample message and renders an explainable result', async () => {
    const user = userEvent.setup();
    const engine = fakeEngine();
    render(<Analyzer engine={engine} handoff={null} />);
    await user.click(screen.getByRole('button', { name: 'Internship fee request' }));
    await user.click(screen.getByRole('button', { name: 'Analyze message' }));
    await waitFor(() => expect(engine.analyze).toHaveBeenCalled());
    expect(await screen.findByText('Detected suspicious phrases')).toBeInTheDocument();
    expect(screen.getByText('Recommended next steps')).toBeInTheDocument();
    expect(screen.getByText(/warning score =/i)).toBeInTheDocument();
  });
  it('loads the model on demand and handles a validation error', async () => {
    const user = userEvent.setup();
    const engine = fakeEngine();
    render(<Analyzer engine={engine} handoff={null} />);
    engine.loadModel.mockClear();
    await user.click(screen.getByRole('button', { name: 'Load model' }));
    expect(engine.loadModel).toHaveBeenCalled();
    await user.click(screen.getByLabelText('Suspicious message text'));
    await user.paste('a'.repeat(4001));
    await user.click(screen.getByRole('button', { name: 'Analyze message' }));
    expect(engine.analyze).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Shorten the message/)).toBeInTheDocument();
  });
  it('accepts text handed off from the screenshot scanner', () => {
    render(<Analyzer engine={fakeEngine()} handoff={{ text: 'Scam text', nonce: 1 }} />);
    expect(screen.getByLabelText('Suspicious message text')).toHaveValue('Scam text');
  });
});

describe('screenshot integration', () => {
  it('validates a file, extracts text, allows correction and analyzes it', async () => {
    const user = userEvent.setup();
    const engine = fakeEngine();
    const onSendText = vi.fn();
    render(<Screenshot engine={engine} onSendText={onSendText} />);
    const bad = new File(['x'], 'notes.txt', { type: 'text/plain' });
    fireEvent.change(document.querySelector('#screenshot-input'), { target: { files: [bad] } });
    expect(screen.getByText(/Unsupported format/)).toBeInTheDocument();
    const png = new File(['png'], 'shot.png', { type: 'image/png' });
    fireEvent.change(document.querySelector('#screenshot-input'), { target: { files: [png] } });
    await user.click(screen.getByRole('button', { name: 'Extract text' }));
    await waitFor(() => expect(screen.getByLabelText('Correct the extracted text if needed').value).toMatch(/won Rs 25000 lottery/));
    await user.clear(screen.getByLabelText('Correct the extracted text if needed'));
    await user.type(screen.getByLabelText('Correct the extracted text if needed'), 'Please share your OTP now and pay a processing fee.');
    await user.click(screen.getByRole('button', { name: 'Analyze extracted text' }));
    await waitFor(() => expect(engine.analyze).toHaveBeenCalledWith('Please share your OTP now and pay a processing fee.'));
    await user.click(screen.getByRole('button', { name: 'Open full analysis' }));
    expect(onSendText).toHaveBeenCalledWith('Please share your OTP now and pay a processing fee.');
  });
});

describe('payment safety integration', () => {
  it('updates the live assessment as answers are selected', async () => {
    const user = userEvent.setup();
    render(<Payment />);
    expect(screen.getByText('Answer all questions for a fuller assessment')).toBeInTheDocument();
    const question = screen.getByText('Have you been asked for an OTP, UPI PIN, password or CVV?').closest('.question-card');
    await user.click(within(question).getByRole('button', { name: 'Yes' }));
    expect(screen.getByText('Pause and check officially')).toBeInTheDocument();
    expect(screen.getByText(/Sharing an OTP/) ).toBeInTheDocument();
    const recipient = screen.getByText('Do you personally know the person or organisation asking for payment?').closest('.question-card');
    await user.click(within(recipient).getByRole('button', { name: 'No' }));
    const pressure = screen.getByText('Are you being pushed to pay or decide immediately?').closest('.question-card');
    await user.click(within(pressure).getByRole('button', { name: 'Yes' }));
    expect(screen.getByText('Stop and verify with the campus office')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText('Answer all questions for a fuller assessment')).toBeInTheDocument();
  });
});

describe('recovery integration', () => {
  it('builds a personalized plan and allows steps to be completed', async () => {
    const user = userEvent.setup();
    render(<Recovery />);
    expect(screen.getByText(/Nothing selected yet/)).toBeInTheDocument();
    const transferred = screen.getByText('Did you transfer money or authorise a payment?').closest('.question-card');
    await user.click(within(transferred).getByRole('button', { name: 'Yes' }));
    expect(screen.getByText('Contact your bank or payment provider')).toBeInTheDocument();
    expect(screen.getByText('Report suspected cybercrime')).toBeInTheDocument();
    const checkbox = screen.getByRole('checkbox', { name: /Contact your bank or payment provider/ });
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(screen.getByRole('link', { name: /Open official portal/ })).toHaveAttribute('href', 'https://cybercrime.gov.in');
  });
});

describe('simulation integration', () => {
  it('shows feedback and a technique after a choice', async () => {
    const user = userEvent.setup();
    render(<Simulation />);
    await user.click(screen.getByRole('button', { name: /Pay quickly/ }));
    expect(screen.getByText(/Risky choice/)).toBeInTheDocument();
    expect(screen.getByText(/Never pay to receive an offer letter/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next scenario' }));
    expect(screen.getAllByText(/Scholarship with a processing charge/).length).toBeGreaterThan(0);
  });
});

describe('security behaviour in the UI', () => {
  it('never renders script injection as executable markup', async () => {
    const user = userEvent.setup();
    const container = render(<Analyzer engine={fakeEngine()} handoff={null} />).container;
    const payload = '<img src=x onerror="window.__pwned=1"><script>window.__pwned=1</script>';
    await user.type(screen.getByLabelText('Suspicious message text'), payload);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(window.__pwned).toBeUndefined();
  });
});
