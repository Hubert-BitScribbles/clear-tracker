import { useState } from 'react';
import { platform } from '../lib/install';
import { HelpLink } from '../components/HelpLink';
import { useLocation, useNavigate } from 'react-router-dom';
import { backupsAvailable, encryptBackup, MIN_PASSPHRASE, payloadFrom } from '../data/backup';
import { getBackupData, setSetting } from '../data/database';
import { todayIso } from '../data/dates';
import './Flow.css';

// Port of the native app/export.tsx, for the web: the browser's own
// encryption (see data/backup.ts), a passphrase of at least 8 characters
// (native allowed 4), settings included, and the file handed to the share
// sheet on iPhone (Files, iCloud Drive, AirDrop) and Android (Drive, Files,
// email), or downloaded where sharing files isn't supported.
const P = platform();
// A successful save is recorded as the last backup.

export function Export() {
  const navigate = useNavigate();
  const location = useLocation();
  const close = () => (location.key === 'default' ? navigate('/settings') : navigate(-1));
  const [step, setStep] = useState(0);
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [saved, setSaved] = useState('');

  async function create() {
    if (pass.length < MIN_PASSPHRASE) return setError(`Passphrase must be at least ${MIN_PASSPHRASE} characters.`);
    if (pass !== confirm) return setError('Passphrases do not match.');
    setError('');
    setBusy(true);
    try {
      const text = await encryptBackup(payloadFrom(await getBackupData()), pass);
      setFile(new File([text], `clear-tracker-backup-${todayIso()}.json`, { type: 'application/json' }));
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!file) return;
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    try {
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: 'Clear Tracker backup' });
      } else {
        const url = URL.createObjectURL(file);
        const a = Object.assign(document.createElement('a'), { href: url, download: file.name });
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
      await setSetting('last_backup_at', new Date().toISOString());
      setSaved('Saved. Keep your passphrase somewhere safe.');
    } catch (e) {
      // Closing the share sheet without choosing anywhere isn't an error.
      setSaved(e instanceof DOMException && e.name === 'AbortError' ? 'Not saved yet.' : 'Couldn’t save the file. Please try again.');
    }
  }

  const dots = (
    <div className="fl-dots" aria-hidden="true">
      {[0, 1, 2].map((k) => <span key={k} className="fl-dot" data-on={k === step || undefined} />)}
    </div>
  );

  if (!backupsAvailable()) {
    return (
      <main className="flow">
        <div className="fl-close-row"><button type="button" className="fl-close" onClick={close} aria-label="Close">✕</button></div>
        <h1 className="fl-title">Export your data</h1>
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
            <h1 className="fl-title">Export your data</h1>
            <p className="fl-body">
              This creates an encrypted backup file with your logged days, intentions and settings. It stays on your
              device until you choose where to save it.
            </p>
            <div className="card fl-card">
              <p className="fl-info">Encrypted with a passphrase you set</p>
              <p className="fl-info">Never sent anywhere by Clear Tracker</p>
            </div>
            <p className="fl-help"><HelpLink topic="backups">About backups and passphrases</HelpLink></p>
          </div>
          <button type="button" className="btn btn-primary fl-button" onClick={() => setStep(1)}>Continue</button>
        </section>
      )}
      {step === 1 && (
        <section className="fl-step">
          <div>
            <h1 className="fl-title">Set a passphrase</h1>
            <p className="fl-body">
              You'll need this to restore the backup. Clear Tracker doesn't keep it, so if you lose it, this backup can't
              be recovered.
            </p>
            <label className="fl-label" htmlFor="ex-pass">Passphrase (at least {MIN_PASSPHRASE} characters)</label>
            <input id="ex-pass" className="fl-input" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} />
            <label className="fl-label" htmlFor="ex-confirm">Confirm passphrase</label>
            <input id="ex-confirm" className="fl-input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {error && <p className="fl-error" role="alert">{error}</p>}
          </div>
          <button type="button" className="btn btn-primary fl-button" onClick={create} disabled={busy}>
            {busy ? 'Creating…' : 'Create encrypted backup'}
          </button>
        </section>
      )}
      {step === 2 && (
        <section className="fl-step">
          <div className="fl-center">
            <div className="fl-tick" aria-hidden="true">✓</div>
            <h1 className="fl-title">Your backup is ready</h1>
            <p className="fl-body">
              Choose where to keep it —{' '}
              {P === 'ios' ? 'Files, iCloud Drive, or another device' : P === 'android' ? 'Google Drive, Files, or email it to yourself' : 'it downloads, and you can move it anywhere'}.
              Keep your passphrase somewhere safe.
            </p>
            {saved && <p className="fl-note" role="status">{saved}</p>}
          </div>
          <div className="fl-actions">
            <button type="button" className="btn btn-primary fl-button" onClick={save}>Save backup file</button>
            <button type="button" className="fl-secondary" onClick={close}>Done</button>
          </div>
        </section>
      )}
    </main>
  );
}
