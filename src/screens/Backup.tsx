import { useState } from 'react';
import { useDevice } from '../components/DeviceFields';
import { platform } from '../lib/install';
import { HelpLink } from '../components/HelpLink';
import { useLocation, useNavigate } from 'react-router-dom';
import { backupsAvailable, encryptBackup, MIN_PASSPHRASE, payloadFrom } from '../data/backup';
import { getBackupData, setSetting } from '../data/database';
import { todayIso } from '../data/dates';
import './Flow.css';
import { t } from '../i18n';

// Port of the native app/export.tsx, for the web: the browser's own
// encryption (see data/backup.ts), a passphrase of at least 8 characters
// (native allowed 4), settings included, and the file handed to the share
// sheet on iPhone (Files, iCloud Drive, AirDrop) and Android (Drive, Files,
// email), or downloaded where sharing files isn't supported.
// A successful save is recorded as the last backup.

export function Backup() {
  const P = platform(useDevice());
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
    if (pass.length < MIN_PASSPHRASE) return setError(t('backup.errShort', { n: MIN_PASSPHRASE }));
    if (pass !== confirm) return setError(t('backup.errMatch'));
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
    // Computers can share files too (macOS Safari and Chrome), but their share
    // sheet offers Mail, Messages and AirDrop with no way to save, so the share
    // sheet is for phones only. On a computer, Chrome and Edge ask where to
    // save; other browsers download.
    const picker = (window as Window & {
      showSaveFilePicker?: (o: unknown) => Promise<{ createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }> }>;
    }).showSaveFilePicker;
    try {
      if (P !== 'other' && nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: t('backup.fileTitle') });
      } else if (P === 'other' && picker) {
        const handle = await picker({
          suggestedName: file.name,
          types: [{ description: t('backup.fileTitle'), accept: { 'application/json': ['.json'] } }],
        });
        const w = await handle.createWritable();
        await w.write(file);
        await w.close();
      } else {
        const url = URL.createObjectURL(file);
        const a = Object.assign(document.createElement('a'), { href: url, download: file.name });
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
      await setSetting('last_backup_at', new Date().toISOString());
      setSaved(t('backup.saved'));
    } catch (e) {
      // Closing the share sheet without choosing anywhere isn't an error.
      setSaved(e instanceof DOMException && e.name === 'AbortError' ? t('backup.notSaved') : t('backup.couldntSave'));
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
        <div className="fl-close-row"><button type="button" className="fl-close" onClick={close} aria-label={t('common.close')}>✕</button></div>
        <h1 className="fl-title">{t('backup.title')}</h1>
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
            <h1 className="fl-title">{t('backup.title')}</h1>
            <p className="fl-body">{t('backup.intro')}</p>
            <div className="card fl-card">
              <p className="fl-info">{t('backup.encrypted')}</p>
              <p className="fl-info">{t('backup.neverSent')}</p>
            </div>
            <p className="fl-help"><HelpLink topic="backups">{t('backup.about')}</HelpLink></p>
          </div>
          <button type="button" className="btn btn-primary fl-button" onClick={() => setStep(1)}>{t('common.continue')}</button>
        </section>
      )}
      {step === 1 && (
        <section className="fl-step">
          <div>
            <h1 className="fl-title">{t('backup.setPassphrase')}</h1>
            <p className="fl-body">{t('backup.passphraseNote')}</p>
            <label className="fl-label" htmlFor="ex-pass">{t('backup.passphraseLabel', { n: MIN_PASSPHRASE })}</label>
            <input id="ex-pass" className="fl-input" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} />
            <label className="fl-label" htmlFor="ex-confirm">{t('backup.confirmLabel')}</label>
            <input id="ex-confirm" className="fl-input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {error && <p className="fl-error" role="alert">{error}</p>}
          </div>
          <button type="button" className="btn btn-primary fl-button" onClick={create} disabled={busy}>
            {busy ? t('backup.creating') : t('backup.create')}
          </button>
        </section>
      )}
      {step === 2 && (
        <section className="fl-step">
          <div className="fl-center">
            <div className="fl-tick" aria-hidden="true">✓</div>
            <h1 className="fl-title">{t('backup.readyTitle')}</h1>
            <p className="fl-body">
              {t('backup.ready', { where: P === 'ios' ? t('backup.whereIos') : P === 'android' ? t('backup.whereAndroid') : t('backup.whereOther') })}
            </p>
            {saved && <p className="fl-note" role="status">{saved}</p>}
          </div>
          <div className="fl-actions">
            <button type="button" className="btn btn-primary fl-button" onClick={save}>{t('backup.saveFile')}</button>
            <button type="button" className="fl-secondary" onClick={close}>{t('common.done')}</button>
          </div>
        </section>
      )}
    </main>
  );
}
