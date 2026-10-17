import { useRef, useState } from 'react';
import { HelpLink } from '../components/HelpLink';
import { useLocation, useNavigate } from 'react-router-dom';
import { BackupError, backupsAvailable, decryptBackup, type BackupPayload } from '../data/backup';
import { getEntryCount, restoreBackup } from '../data/database';
import { loadMoneyCountry } from '../lib/moneyRegion';
import './Flow.css';
import { t } from '../i18n';
import { mediumDate } from '../i18n/format';

// Port of the native app/import.tsx: choose a file, enter its passphrase,
// confirm, then everything on this device is replaced in one step (a
// failure changes nothing). Reads web backups only; the app started fresh.

export function Restore() {
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
      setError(e instanceof BackupError ? e.message : t('restore.unreadable'));
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (!parsed) return;
    setBusy(true);
    try {
      await restoreBackup(parsed);
      await loadMoneyCountry(); // the backup's region decides the currency
      setStep(3);
    } catch {
      setError(t('restore.failed'));
    } finally {
      setBusy(false);
    }
  }

  const dots = (
    <div className="fl-dots" aria-hidden="true">
      {[0, 1, 2].map((k) => <span key={k} className="fl-dot" data-on={k === Math.min(step, 2) || undefined} />)}
    </div>
  );
  const plural = (n: number) => t('restore.loggedDays', { count: n });
  const exported = parsed?.exportedAt ? mediumDate(new Date(parsed.exportedAt)) : '—';

  if (!backupsAvailable()) {
    return (
      <main className="flow">
        <div className="fl-close-row"><button type="button" className="fl-close" onClick={close} aria-label={t('common.close')}>✕</button></div>
        <h1 className="fl-title">{t('restore.title')}</h1>
        <p className="fl-body">{t('backup.insecure')}</p>
      </main>
    );
  }

  return (
    <main className="flow">
      {dots}
      {step === 0 && (
        <section className="fl-step">
          <div>
            <div className="fl-close-row"><button type="button" className="fl-close" onClick={close} aria-label={t('common.close')}>✕</button></div>
            <h1 className="fl-title">{t('restore.title')}</h1>
            <p className="fl-danger">{t('restore.warning')}</p>
            <p className="fl-body">{t('restore.choose')}</p>
            <p className="fl-help"><HelpLink topic="backups">{t('restore.about')}</HelpLink></p>
          </div>
          <div>
            <input ref={input} type="file" accept=".json,application/json" hidden onChange={(e) => choose(e.target.files?.[0])} aria-label={t('restore.fileLabel')} />
            <button type="button" className="fl-secondary" onClick={() => input.current?.click()}>{t('restore.chooseFile')}</button>
          </div>
        </section>
      )}
      {step === 1 && (
        <section className="fl-step">
          <div>
            <h1 className="fl-title">{t('restore.enterPassphrase')}</h1>
            <p className="fl-file">{name}</p>
            <label className="fl-label" htmlFor="im-pass">{t('restore.passphraseLabel')}</label>
            <input id="im-pass" className="fl-input" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} />
            {error && <p className="fl-error" role="alert">{error}</p>}
          </div>
          <button type="button" className="btn btn-primary fl-button" onClick={check} disabled={busy}>
            {busy ? t('restore.checking') : t('common.continue')}
          </button>
        </section>
      )}
      {step === 2 && parsed && (
        <section className="fl-step">
          <div>
            <h1 className="fl-title">{t('restore.confirm')}</h1>
            <div className="card fl-card" style={{ marginBottom: 12 }}>
              <div className="fl-row"><span>{t('restore.daysInBackup')}</span><strong>{parsed.dayEntries.length}</strong></div>
              <div className="fl-row"><span>{t('restore.intentions')}</span><strong>{parsed.intentions.length}</strong></div>
              <div className="fl-row"><span>{t('restore.backedUp')}</span><strong>{exported}</strong></div>
            </div>
            <p className="fl-danger">
              {t('restore.replaceWarning', { current: plural(current), incoming: plural(parsed.dayEntries.length) })}
            </p>
            {error && <p className="fl-error" role="alert">{error}</p>}
          </div>
          <button type="button" className="fl-danger-btn" onClick={restore} disabled={busy}>
            {busy ? t('restore.restoring') : t('restore.replace')}
          </button>
        </section>
      )}
      {step === 3 && (
        <section className="fl-step">
          <div className="fl-center">
            <div className="fl-tick" aria-hidden="true">✓</div>
            <h1 className="fl-title">{t('restore.done')}</h1>
          </div>
          <button type="button" className="btn btn-primary fl-button" onClick={() => navigate('/', { replace: true })}>
            {t('restore.goCheckin')}
          </button>
        </section>
      )}
    </main>
  );
}
