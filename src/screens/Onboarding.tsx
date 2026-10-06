import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import iconUrl from '../assets/clear-icon-96.png';
import { DayCell } from '../components/DayCell';
import { RegionFields } from '../components/RegionFields';
import { nextLevel, saveIntention, setSetting, type DayLevel } from '../data/database';
import { mondayOf, todayIso } from '../data/dates';
import {
  canPromptInstall, isAndroid, isInstalled, isIos, onInstallAvailability, promptInstall, requestPersistentStorage,
} from '../lib/install';
import { deviceTimeZone, parseRegion, regionLabel, type Region } from '../lib/regions';
import { playLoggingSound, unlockAudio } from '../lib/sounds';
import { Estimate } from './Intention';
import './Onboarding.css';

// Started as a port of the native app/onboarding.tsx (welcome, intention,
// data), extended for the web:
// - What Clear Tracker is and isn't, up front (the disclaimer).
// - Add to the Home Screen, shown only in a browser tab, before anything is
//   set up: an installed app on iPhone has its own storage.
// - Privacy before any choices, with a way in for restoring a backup.
// - How logging works, with a practice day to tap (nothing is saved).
// - Region, guessed from the time zone, deciding what Resources shows.
// - Where support lives, then Start tracking (asks for persistent storage).
// App lock is dropped on the web. Every step after the first has Back.

type Step = 'welcome' | 'install' | 'privacy' | 'how' | 'intention' | 'region' | 'ready';

const LEVEL_SHOWN: Record<DayLevel, string> = {
  clear: 'Clear — no drinks',
  'a-few': 'A few — 1–2 drinks',
  moderate: 'Moderate — 3–4 drinks',
  'a-lot': 'A lot — 5 or more',
};

export function Onboarding() {
  const navigate = useNavigate();
  const installed = isInstalled();
  const steps: Step[] = ['welcome', ...(installed ? [] : (['install'] as Step[])), 'privacy', 'how', 'intention', 'region', 'ready'];
  const [i, setI] = useState(0);
  const [target, setTarget] = useState(3);
  const [audioCues, setAudioCues] = useState(true);
  const [practice, setPractice] = useState<DayLevel | null>(null);
  const [region, setRegion] = useState<Region>(() => parseRegion('', deviceTimeZone()));
  const [saving, setSaving] = useState(false);
  const [canInstall, setCanInstall] = useState(canPromptInstall());
  useEffect(() => onInstallAvailability(() => setCanInstall(canPromptInstall())), []);

  const step = steps[i];
  const go = (d: number) => {
    setI((n) => Math.min(Math.max(n + d, 0), steps.length - 1));
    window.scrollTo(0, 0);
  };
  const next = () => go(1);
  const today = todayIso();
  const fill = ((target - 1) / 6) * 100;

  function tapPractice() {
    if (audioCues) unlockAudio(); // during the tap, before anything else
    const level = nextLevel(practice);
    setPractice(level);
    if (audioCues && level) playLoggingSound(level);
  }

  async function finish() {
    setSaving(true);
    const persist = requestPersistentStorage(); // during the tap, as browsers require
    await saveIntention(target, mondayOf(today));
    await setSetting('audio_cues_enabled', audioCues ? 'true' : 'false');
    await setSetting('region', JSON.stringify(region));
    await setSetting('onboarding_complete', 'true');
    await persist;
    navigate('/', { replace: true });
  }

  return (
    <main className="onboarding">
      <div className="ob-top">
        {i > 0 ? (
          <button type="button" className="ob-back" onClick={() => go(-1)}>‹ Back</button>
        ) : <span />}
      </div>
      <div className="ob-title-row">
        <img src={iconUrl} alt="" width="56" height="56" className="ob-icon" />
        <span className="ob-app-title">Clear Tracker</span>
      </div>
      <div className="ob-dots" aria-hidden="true">
        {steps.map((s, k) => <span key={s} className="ob-dot" data-on={k === i || undefined} />)}
      </div>
      <p className="sr-only" aria-live="polite">Step {i + 1} of {steps.length}</p>

      {step === 'welcome' && (
        <section className="ob-step">
          <div>
            <div className="ob-center">
              <h1 className="ob-headline">Welcome to Clear Tracker</h1>
              <p className="ob-body">
                A simple way to track days you choose not to drink — whether that's cutting back or stepping away
                completely. There's no wrong way to use this.
              </p>
            </div>
            <div className="card ob-card">
              <p className="ob-card-title">What it is</p>
              <p className="ob-card-body">A private record of your days, and how they add up over weeks and months.</p>
              <p className="ob-card-title">What it isn't</p>
              <p className="ob-card-body">
                A medical service or treatment programme. It doesn't diagnose, advise or judge. If you're concerned about
                your drinking, a healthcare professional can help.
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-primary ob-button" onClick={next}>Get started</button>
        </section>
      )}

      {step === 'install' && (
        <section className="ob-step">
          <div>
            <h1 className="ob-step-title">Add it to your Home Screen first</h1>
            <p className="ob-body">
              Clear Tracker keeps everything on this device. Added to your Home Screen, it opens like an app, works
              offline, and your record is much safer: a browser can clear a website's data, but not an installed
              app's.
            </p>
            {isIos() ? (
              <div className="card ob-card">
                <ol className="ob-steps">
                  <li>Tap the <strong>Share</strong> button <span aria-hidden="true">(□↑)</span> in Safari.</li>
                  <li>Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
                  <li>Open Clear Tracker from your Home Screen and set it up there.</li>
                </ol>
                <p className="ob-note">The installed app starts fresh — anything set up here in Safari stays in Safari.</p>
              </div>
            ) : canInstall ? (
              <div className="card ob-card">
                <button type="button" className="btn btn-primary ob-button" onClick={() => promptInstall()}>
                  Install Clear Tracker
                </button>
                <p className="ob-note">Then open it from your Home Screen or app list and carry on there.</p>
              </div>
            ) : (
              <div className="card ob-card">
                <p className="ob-note ob-note-first">
                  {isAndroid() ? (
                    <>In Chrome, tap <strong>⋮</strong>, then <strong>Install app</strong> (or Add to Home screen).</>
                  ) : (
                    <>Look in your browser's menu for <strong>Install</strong> or <strong>Add to Home Screen</strong>.</>
                  )}
                </p>
              </div>
            )}
          </div>
          <div className="ob-actions">
            <button type="button" className="ob-secondary" onClick={next}>Continue in the browser</button>
            <p className="ob-note">
              {isIos()
                ? "You can still install later, but your data won't move across — export it first."
                : 'You can install later from the browser menu; your days come with you.'}
            </p>
          </div>
        </section>
      )}

      {step === 'privacy' && (
        <section className="ob-step">
          <div>
            <h1 className="ob-step-title">Your record stays on this device</h1>
            <ul className="card ob-card ob-points">
              <li><strong>No account, no cloud.</strong> Nothing you log is sent to bitScribbles or anyone else, and there are no ads.</li>
              <li><strong>Only here.</strong> Your days are stored on this device{installed ? '' : ', in this browser'}. Clearing its website data, or losing the device, loses them.</li>
              <li><strong>Back up now and then.</strong> Settings can export an encrypted backup, protected by a passphrase you choose, to keep wherever you like. Check-in reminds you after 30 days.</li>
            </ul>
          </div>
          <div className="ob-actions">
            <button type="button" className="btn btn-primary ob-button" onClick={next}>Continue</button>
            <p className="ob-note">
              Restoring from a backup? <Link className="ob-link" to="/settings/import">Import it</Link> instead.
            </p>
          </div>
        </section>
      )}

      {step === 'how' && (
        <section className="ob-step">
          <div>
            <h1 className="ob-step-title">Logging a day</h1>
            <p className="ob-body">
              On Check-in, tap a day to select it, then tap it again to log it. Each tap moves it on a level, and back to
              not logged. Try it on this practice day — it isn't saved.
            </p>
            <div className="ob-practice">
              <div className="ob-practice-cell">
                <DayCell
                  day={Number(today.slice(8, 10))}
                  level={practice}
                  onClick={tapPractice}
                  label={`Practice day: ${practice ? LEVEL_SHOWN[practice] : 'not logged'}. Tap for the next level.`}
                />
              </div>
              <p className="ob-practice-level" aria-live="polite">{practice ? LEVEL_SHOWN[practice] : 'Not logged'}</p>
            </div>
            <p className="ob-note">
              Days you don't log are simply not logged — nothing assumes how they went. Past days can be logged or
              changed at any time.
            </p>
            <div className="card ob-card ob-toggle-card">
              <div className="ob-toggle-row">
                <div>
                  <span id="ob-audio" className="ob-row-label">Sounds</span>
                  <p className="ob-row-sub">A tone for each level when you log a day.{isIos() ? ' On iPhone, they follow the silent switch.' : isAndroid() ? ' They play at your media volume.' : ''}</p>
                </div>
                <button type="button" role="switch" aria-checked={audioCues} aria-labelledby="ob-audio" className="switch" onClick={() => setAudioCues((v) => !v)}>
                  <span className="switch-thumb" />
                </button>
              </div>
            </div>
          </div>
          <button type="button" className="btn btn-primary ob-button" onClick={next}>Continue</button>
        </section>
      )}

      {step === 'intention' && (
        <section className="ob-step">
          <div>
            <h1 className="ob-step-title">Set your first intention</h1>
            <p className="ob-body">How many clear days would you like to aim for each week? You can change this any time.</p>
            <div className="ob-number">
              <span className="ob-big" aria-hidden="true">{target}</span>
              <span className="ob-number-label">clear days per week</span>
            </div>
            <input
              type="range"
              className="in-slider"
              min={1}
              max={7}
              step={1}
              value={target}
              aria-label="Clear days per week"
              aria-valuetext={`${target} clear day${target === 1 ? '' : 's'} per week`}
              style={{ background: `linear-gradient(to right, var(--primary) ${fill}%, var(--track) ${fill}%)` }}
              onChange={(e) => setTarget(Number(e.target.value))}
            />
            <div className="in-callout">
              <p>
                Starting today — <Estimate target={target} from={today} />
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-primary ob-button" onClick={next}>Continue</button>
        </section>
      )}

      {step === 'region' && (
        <section className="ob-step">
          <div>
            <h1 className="ob-step-title">Where are you?</h1>
            <p className="ob-body">
              So Clear Tracker can show help lines and programmes for where you live. It stays on this device, and you
              can change it in Settings.
            </p>
            <div className="card ob-card">
              <RegionFields region={region} onChange={setRegion} />
            </div>
          </div>
          <button type="button" className="btn btn-primary ob-button" onClick={next}>Continue</button>
        </section>
      )}

      {step === 'ready' && (
        <section className="ob-step">
          <div>
            <h1 className="ob-step-title">You're ready</h1>
            <p className="ob-body">
              Aiming for {target} clear day{target === 1 ? '' : 's'} a week. Every day you log adds to the picture —
              there's no score to keep.
            </p>
            <div className="card ob-card">
              <p className="ob-card-title">If you'd like support</p>
              <p className="ob-card-body">
                <strong>Resources</strong> lists help lines and programmes for {regionLabel(region)}, including someone to
                talk to any time. <strong>Help</strong> answers common questions about the app.
              </p>
              <p className="ob-card-body">Both are linked from the bottom of Check-in, and in Settings.</p>
            </div>
          </div>
          <button type="button" className="btn btn-primary ob-button" onClick={finish} disabled={saving}>
            {saving ? 'Setting up…' : 'Start tracking'}
          </button>
        </section>
      )}
    </main>
  );
}
