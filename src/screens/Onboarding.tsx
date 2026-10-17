import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import iconUrl from '../assets/clear-icon-96.png';
import { DayCell } from '../components/DayCell';
import { RegionFields } from '../components/RegionFields';
import { setMoneyCountry } from '../lib/savings';
import { getSetting, nextLevel, saveIntention, setSetting, type DayLevel } from '../data/database';
import { mondayOf, todayIso } from '../data/dates';
import { DeviceFields, useDevice } from '../components/DeviceFields';
import { installGuide } from '../components/InstallSteps';
import {
  canPromptInstall, installKeepsOwnRecord, isAndroid, isInstalled, isIos, onInstallAvailability, promptInstall, requestPersistentStorage,
} from '../lib/install';
import { deviceTimeZone, parseRegion, regionLabel, type Region } from '../lib/regions';
import { playLoggingSound, unlockAudio } from '../lib/sounds';
import { Estimate } from './Intention';
import './Onboarding.css';
import { rich, t } from '../i18n';
import { monthYear } from '../i18n/format';

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

const levelShown = (l: DayLevel) => t(`onboarding.level.${l}`);

export function Onboarding() {
  const navigate = useNavigate();
  const installed = isInstalled();
  const dev = useDevice();
  const steps: Step[] = ['welcome', ...(installed ? [] : (['install'] as Step[])), 'privacy', 'how', 'intention', 'region', 'ready'];
  const [i, setI] = useState(0);
  const [target, setTarget] = useState(3);
  const [audioCues, setAudioCues] = useState(true);
  const [practice, setPractice] = useState<DayLevel | null>(null);
  const [tried, setTried] = useState(false);
  const [region, setRegion] = useState<Region>(() => parseRegion('', deviceTimeZone()));
  const [saving, setSaving] = useState(false);
  const [canInstall, setCanInstall] = useState(canPromptInstall());
  useEffect(() => onInstallAvailability(() => setCanInstall(canPromptInstall())), []);

  // Already set up? Go to Check-in. The app can open here when it isn't
  // needed: the browser hands the tab's address to the installed app, or an
  // app window reopens where it was left. Going through again would re-save
  // this week's intention, sounds and region.
  const [needed, setNeeded] = useState(false);
  useEffect(() => {
    getSetting('onboarding_complete', 'false').then((v) => (v === 'true' ? navigate('/', { replace: true }) : setNeeded(true)));
  }, [navigate]);

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
    setTried(true);
    if (audioCues && level) playLoggingSound(level);
  }

  async function finish() {
    setSaving(true);
    const persist = requestPersistentStorage(); // during the tap, as browsers require
    await saveIntention(target, mondayOf(today));
    await setSetting('audio_cues_enabled', audioCues ? 'true' : 'false');
    await setSetting('region', JSON.stringify(region));
    setMoneyCountry(region.country);
    await setSetting('onboarding_complete', 'true');
    await persist;
    navigate('/', { replace: true });
  }

  if (!needed) return null;

  return (
    <main className="onboarding">
      <div className="ob-top">
        {i > 0 ? (
          <button type="button" className="ob-back" onClick={() => go(-1)}>{t('onboarding.back')}</button>
        ) : <span />}
      </div>
      <div className="ob-title-row">
        <img src={iconUrl} alt="" width="56" height="56" className="ob-icon" />
        <span className="ob-app-title">Clear Tracker</span>
      </div>
      <div className="ob-dots" aria-hidden="true">
        {steps.map((s, k) => <span key={s} className="ob-dot" data-on={k === i || undefined} />)}
      </div>
      <p className="sr-only" aria-live="polite">{t('onboarding.step', { n: i + 1, total: steps.length })}</p>

      {step === 'welcome' && (
        <section className="ob-step">
          <div>
            <div className="ob-center">
              <h1 className="ob-headline">{t('onboarding.welcome')}</h1>
              <p className="ob-body">{t('onboarding.welcomeBody')}</p>
            </div>
            <div className="card ob-card">
              <p className="ob-card-title">{t('onboarding.whatItIs')}</p>
              <p className="ob-card-body">{t('onboarding.whatItIsBody')}</p>
              <p className="ob-card-title">{t('onboarding.whatItIsnt')}</p>
              <p className="ob-card-body">{t('onboarding.whatItIsntBody')}</p>
            </div>
            <div className="ob-device">
              <DeviceFields />
              <p className="ob-note">{t('onboarding.oneDevice')}</p>
              {installKeepsOwnRecord(dev) && !installed && (
                // A browser tab can't see a Home Screen (or Dock) copy — separate
                // storage, and no way to ask — so it always looks like a first visit.
                <p className="ob-note ob-already">
                  {isIos(dev) ? t('onboarding.alreadyIos') : t('onboarding.alreadyMac')}
                </p>
              )}
            </div>
          </div>
          <button type="button" className="btn btn-primary ob-button" onClick={next}>{t('onboarding.getStarted')}</button>
        </section>
      )}

      {step === 'install' && (() => {
        const g = installGuide(dev, canInstall);
        return (
          <section className="ob-step">
            <div>
              <h1 className="ob-step-title">{g.heading}</h1>
              <p className="ob-body">{g.why}</p>
              <div className="card ob-card">
                {g.steps.length === 0 ? (
                  <>
                    <button type="button" className="btn btn-primary ob-button" onClick={() => promptInstall()}>
                      {t('onboarding.install')}
                    </button>
                    <p className="ob-note">{t('onboarding.thenOpen', { place: g.place })}</p>
                  </>
                ) : (
                  <ol className="ob-steps">
                    {g.steps.map((st, k) => <li key={k}>{st}</li>)}
                  </ol>
                )}
                {g.note && <p className="ob-note ob-install-note">{g.note}</p>}
              </div>
            </div>
            <div className="ob-actions">
              <button type="button" className="ob-secondary" onClick={next}>
                {g.canInstall ? t('onboarding.continueInBrowser') : t('common.continue')}
              </button>
              {g.canInstall && (
                <p className="ob-note">
                  {installKeepsOwnRecord(dev)
                    ? t('onboarding.laterOwnRecord')
                    : t('onboarding.laterShared')}
                </p>
              )}
            </div>
          </section>
        );
      })()}

      {step === 'privacy' && (
        <section className="ob-step">
          <div>
            <h1 className="ob-step-title">{t('onboarding.privacyTitle')}</h1>
            <ul className="card ob-card ob-points">
              <li>{rich('onboarding.privacyNoAccount', { b: (c) => <strong>{c}</strong> })}</li>
              <li>{rich('onboarding.privacyOnlyHere', { where: installed ? '' : t('onboarding.privacyInBrowser'), b: (c) => <strong>{c}</strong> })}</li>
              <li>{rich('onboarding.privacyBackUp', { b: (c) => <strong>{c}</strong> })}</li>
            </ul>
          </div>
          <div className="ob-actions">
            <button type="button" className="btn btn-primary ob-button" onClick={next}>{t('common.continue')}</button>
            <p className="ob-note">
              {rich('onboarding.haveBackup', { link: (c) => <Link className="ob-link" to="/settings/restore">{c}</Link> })}
            </p>
          </div>
        </section>
      )}

      {step === 'how' && (
        <section className="ob-step">
          <div>
            <h1 className="ob-step-title">{t('onboarding.howTitle')}</h1>
            <p className="ob-body">{t('onboarding.howBody')}</p>
            <div className="ob-practice">
              <p className="ob-practice-month" aria-hidden="true">
                {monthYear(Number(today.slice(5, 7)), Number(today.slice(0, 4)), 'short')}
              </p>
              <div className="ob-practice-cell">
                <DayCell
                  day={Number(today.slice(8, 10))}
                  level={practice}
                  onClick={tapPractice}
                  label={t('onboarding.practiceLabel', { level: practice ? levelShown(practice) : t('onboarding.practiceNotLoggedSpoken') })}
                />
              </div>
              <p className="ob-practice-level" aria-live="polite">{practice ? levelShown(practice) : tried ? t('onboarding.practiceNotLogged') : t('onboarding.practiceTry')}</p>
            </div>
            <p className="ob-note">{t('onboarding.howNote')}</p>
            <div className="card ob-card ob-toggle-card">
              <div className="ob-toggle-row">
                <div>
                  <span id="ob-audio" className="ob-row-label">{t('onboarding.sounds')}</span>
                  <p className="ob-row-sub">{t('onboarding.soundsSub')}{isIos(dev) ? t('onboarding.soundsIos') : isAndroid(dev) ? t('onboarding.soundsAndroid') : ''}</p>
                </div>
                <button type="button" role="switch" aria-checked={audioCues} aria-labelledby="ob-audio" className="switch" onClick={() => setAudioCues((v) => !v)}>
                  <span className="switch-thumb" />
                </button>
              </div>
            </div>
          </div>
          <button type="button" className="btn btn-primary ob-button" onClick={next}>{t('common.continue')}</button>
        </section>
      )}

      {step === 'intention' && (
        <section className="ob-step">
          <div>
            <h1 className="ob-step-title">{t('onboarding.intentionTitle')}</h1>
            <p className="ob-body">{t('onboarding.intentionBody')}</p>
            <div className="ob-number">
              <span className="ob-big" aria-hidden="true">{target}</span>
              <span className="ob-number-label">{t('intention.perWeek')}</span>
            </div>
            <input
              type="range"
              className="in-slider"
              min={1}
              max={7}
              step={1}
              value={target}
              aria-label={t('intention.sliderLabel')}
              aria-valuetext={t('intention.sliderValue', { count: target })}
              style={{ background: `linear-gradient(to right, var(--primary) ${fill}%, var(--track) ${fill}%)` }}
              onChange={(e) => setTarget(Number(e.target.value))}
            />
            <div className="in-callout">
              <p>
                {t('onboarding.startingToday')}<Estimate target={target} from={today} />
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-primary ob-button" onClick={next}>{t('common.continue')}</button>
        </section>
      )}

      {step === 'region' && (
        <section className="ob-step">
          <div>
            <h1 className="ob-step-title">{t('onboarding.regionTitle')}</h1>
            <p className="ob-body">{t('onboarding.regionBody')}</p>
            <div className="card ob-card">
              <RegionFields region={region} onChange={setRegion} />
            </div>
          </div>
          <button type="button" className="btn btn-primary ob-button" onClick={next}>{t('common.continue')}</button>
        </section>
      )}

      {step === 'ready' && (
        <section className="ob-step">
          <div>
            <h1 className="ob-step-title">{t('onboarding.readyTitle')}</h1>
            <p className="ob-body">{t('onboarding.aiming', { count: target })}</p>
            <div className="card ob-card">
              <p className="ob-card-title">{t('onboarding.support')}</p>
              <p className="ob-card-body">
                {rich('onboarding.supportBody', { region: regionLabel(region), b: (c) => <strong>{c}</strong> })}
              </p>
              <p className="ob-card-body">{t('onboarding.supportWhere')}</p>
            </div>
          </div>
          <button type="button" className="btn btn-primary ob-button" onClick={finish} disabled={saving}>
            {saving ? t('onboarding.settingUp') : t('onboarding.start')}
          </button>
        </section>
      )}
    </main>
  );
}
