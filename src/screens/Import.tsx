import { useRef, useState } from 'react';
import { HelpLink } from '../components/HelpLink';
import { useLocation, useNavigate } from 'react-router-dom';
import { BackupError, backupsAvailable, decryptBackup, type BackupPayload } from '../data/backup';
import { getEntryCount, restoreBackup } from '../data/database';
import './Flow.css';

// Port of the native app/import.tsx: choose a file, enter its passphrase,
// confirm, then everything on this device is replaced in one step (a
// failure changes nothing). Reads web backups only; the app started fresh.

export function Import() {
  const navigate = useNavigate();
  const location = useLocation();
  const close = () => (location.key === 'default' ? navigate('/settings') : navigate(-1));
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState<BackupPayload | null>(null);
  const [current, setCurrent] = useState(0);

  async function choose(f: File | undefined) {
    if (!f) return;
    setName(f.name);
    setText(await f.text());
    setError('');
    setStep(1);
  }

  async function check() {
    setBusy(true);
    setError('');
    try {
      const p = await decryptBackup(text, pass);
      setParsed(p);
      setCurrent(await getEntryCount());
      setStep(2);
    } catch (e) {
      setError(e instanceof BackupError ? e.message : 'This file could not be read.');
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (!parsed) return;
    setBusy(true);
    try {
      await restoreBackup(parsed);
      setStep(3);
    } catch {
      setError('Something went wrong restoring this backup. Nothing was changed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const dots = (
    <div className="fl-dots" aria-hidden="true">
      {[0, 1, 2].map((k) => <span key={k} className="fl-dot" data-on={k === Math.min(step, 2) || undefined} />)}
    </div>
  );
  const plural = (n: number) => `${n} logged day${n === 1 ? '' : 's'}`;
  const exported = parsed?.exportedAt ? new Date(parsed.exportedAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';

  if (!backupsAvailable()) {
    return (
      <main className="flow">
        <div className="fl-close-row"><button type="button" className="fl-close" onClick={close} aria-label="Close">✕</button></div>
        <h1 className="fl-title">Import a backup</h1>
        <p className="fl-body">
          Backups use your browser's built-in encryption, which only works on the app's secure (https) address — not
          on a local network address like this one.
        </p>
      </main>
    );
  }

  return (
    <main className="flow">
      {dots}
      {step === 0 && (
        <section className="fl-step">
          <div>
            <div className="fl-close-row"><button type="button" className="fl-close" onClick={close} aria-label="Close">✕</button></div>
            <h1 className="fl-title">Import a backup</h1>
            <p className="fl-danger">Restoring a backup replaces all data currently on this device. This can't be undone.</p>
            <p className="fl-body">Choose an encrypted backup file exported from Clear Tracker.</p>
            <p className="fl-help"><HelpLink topic="backups">About backups</HelpLink></p>
          </div>
          <div>
            <input ref={input} type="file" accept=".json,application/json" hidden onChange={(e) => choose(e.target.files?.[0])} aria-label="Backup file" />
            <button type="button" className="fl-secondary" onClick={() => input.current?.click()}>Choose file</button>
          </div>
        </section>
      )}
      {step === 1 && (
        <section className="fl-step">
          <div>
            <h1 className="fl-title">Enter passphrase</h1>
            <p className="fl-file">{name}</p>
            <label className="fl-label" htmlFor="im-pass">The backup's passphrase</label>
            <input id="im-pass" className="fl-input" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} />
            {error && <p className="fl-error" role="alert">{error}</p>}
          </div>
          <button type="button" className="btn btn-primary fl-button" onClick={check} disabled={busy}>
            {busy ? 'Checking…' : 'Continue'}
          </button>
        </section>
      )}
      {step === 2 && parsed && (
        <section className="fl-step">
          <div>
            <h1 className="fl-title">Confirm restore</h1>
            <div className="card fl-card" style={{ marginBottom: 12 }}>
              <div className="fl-row"><span>Logged days in backup</span><strong>{parsed.dayEntries.length}</strong></div>
              <div className="fl-row"><span>Intentions</span><strong>{parsed.intentions.length}</strong></div>
              <div className="fl-row"><span>Exported</span><strong>{exported}</strong></div>
            </div>
            <p className="fl-danger">
              This will replace the {plural(current)} currently on this device with the {plural(parsed.dayEntries.length)} from
              this backup, along with your intentions and settings. This can't be undone.
            </p>
            {error && <p className="fl-error" role="alert">{error}</p>}
          </div>
          <button type="button" className="fl-danger-btn" onClick={restore} disabled={busy}>
            {busy ? 'Restoring…' : 'Replace data and restore'}
          </button>
        </section>
      )}
      {step === 3 && (
        <section className="fl-step">
          <div className="fl-center">
            <div className="fl-tick" aria-hidden="true">✓</div>
            <h1 className="fl-title">Your data has been restored</h1>
          </div>
          <button type="button" className="btn btn-primary fl-button" onClick={() => navigate('/', { replace: true })}>
            Go to Check-in
          </button>
        </section>
      )}
    </main>
  );
}
