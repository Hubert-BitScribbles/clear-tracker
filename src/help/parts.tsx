// Pieces of Help that do something: the sound test and the contact buttons.

import { useEffect, useState } from 'react';
import { rich, t } from '../i18n';
import { audioStatus, playLoggingSound, unlockAudio } from '../lib/sounds';
import { diagnostics, mailto, SUPPORT_EMAIL } from '../lib/support';

export function SoundTest() {
  const [status, setStatus] = useState(audioStatus());
  return (
    <div className="sp-buttons">
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          unlockAudio();
          playLoggingSound('clear');
          setStatus(audioStatus());
          setTimeout(() => setStatus(audioStatus()), 1500);
        }}
      >
        {t('help.playTone')}
      </button>
      <p className="sp-details" role="status" style={{ fontFamily: 'var(--font-mono)' }}>{status}</p>
    </div>
  );
}

/** Feedback and problem reports by email. The technical details stay in English: they're for us to read. */
export function Contact() {
  const [details, setDetails] = useState('');
  useEffect(() => {
    diagnostics().then(setDetails);
  }, []);
  const report = mailto(t('help.contact.problemSubject'), `${t('help.contact.problemBody')}\n\n\n\n${t('help.contact.technical')}\n${details}`);
  return (
    <>
      <p>{t('help.contact.intro', { email: SUPPORT_EMAIL })}</p>
      <p>{rich('help.contact.noHealth', { b: (c) => <strong>{c}</strong> })}</p>
      <div className="sp-buttons">
        <a className="sp-action sp-action-strong" href={mailto(t('help.contact.feedbackSubject'), '')}>{t('help.contact.feedback')}</a>
        <a className="sp-action" href={report}>{t('help.contact.report')}</a>
      </div>
      <details className="sp-details">
        <summary>{t('help.contact.includes')}</summary>
        <pre>{details}</pre>
        <p>{t('help.contact.includesBody')}</p>
      </details>
      <p>{t('help.contact.email')}</p>
    </>
  );
}
