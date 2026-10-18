import { useEffect, useState } from 'react';
import { DeviceFields, useDevice } from '../components/DeviceFields';
import { wholeDrinks } from '../lib/reportText';
import { installKeepsOwnRecord, isAndroid, isIos, linksOpenApp } from '../lib/install';
import { Link, useLocation } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { baselineText, SavingsSetup } from '../components/SavingsCard';
import { getEntryCount, getSavingsSettings, getSetting, resetDatabase, setSetting, type SavingsSettings } from '../data/database';
import { BASELINE_KEY, PRICE_KEY, priceText, setMoneyCountry } from '../lib/savings';
import { daysAgoText } from '../lib/backupNudge';
import { daysBetween, localDateOf, todayIso } from '../data/dates';
import { useAppearance } from '../theme/AppearanceContext';
import type { ThemePref } from '../theme/appearance';
import { SettingsNav } from './About';
import { deviceTimeZone, parseRegion, regionLabel, type Region } from '../lib/regions';
import { RegionFields } from '../components/RegionFields';
import './Settings.css';
import { LANGUAGES, pickLanguage, rich, t, type Key } from '../i18n';
import { chooseLanguage, LANGUAGE_KEY } from '../lib/language';

// Port of the native app/(tabs)/settings.tsx, adapted for the web:
// - Reminders: instructions for a repeating reminder in the phone's own
//   Reminders app, with a link back (porting plan: no web notifications).
// - App lock: dropped (porting plan).
// - Savings estimate: the baseline and price live here.
// - Descriptions updated to match what high contrast and sounds now do.
// - Erase also resets settings (as native did); the message says so.

const THEMES: { key: ThemePref; label: Key }[] = [
  { key: 'light', label: 'settings.themeLight' },
  { key: 'dark', label: 'settings.themeDark' },
  { key: 'system', label: 'settings.themeSystem' },
];

function Toggle({ id, label, sub, value, onChange }: { id: string; label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="st-row">
      <div className="st-row-text">
        <span id={id} className="st-label">{label}</span>
        {sub && <p className="st-sub">{sub}</p>}
      </div>
      <button type="button" role="switch" aria-checked={value} aria-labelledby={id} className="switch" onClick={() => onChange(!value)}>
        <span className="switch-thumb" />
      </button>
    </div>
  );
}

export function Settings() {
  const { theme, highContrast, setAppearance } = useAppearance();
  const [audioCues, setAudioCues] = useState(true);
  const [dayStreak, setDayStreak] = useState(false);
  const [savings, setSavings] = useState<SavingsSettings | null>(null);
  const [editingSavings, setEditingSavings] = useState(false);
  const [ready, setReady] = useState(false);
  const [eraseCount, setEraseCount] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  // Bumped after erasing, so cards that load their own setting (Region) reload too.
  const [version, setVersion] = useState(0);
  const [, setCurrencyShown] = useState(0); // redraws savings when the region (and so the currency) changes
  const location = useLocation();

  async function load() {
    const [a, d, sv, lb] = await Promise.all([
      getSetting('audio_cues_enabled', 'true'),
      getSetting('day_streak_enabled', 'false'),
      getSavingsSettings(),
      getSetting('last_backup_at', ''),
    ]);
    setSavings(sv);
    setLastBackup(lb === '' ? null : lb);
    setAudioCues(a === 'true');
    setDayStreak(d === 'true');
    setReady(true);
  }
  useEffect(() => {
    load();
  }, []);

  // Arriving from Trends ("Set up in Settings"): scroll to the savings section.
  useEffect(() => {
    if (ready && (location.hash === '#savings' || location.hash === '#region')) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [ready, location.hash]);

  const toggle = (key: string, set: (v: boolean) => void) => async (v: boolean) => {
    set(v);
    await setSetting(key, v ? 'true' : 'false');
  };

  if (!ready || !savings) return <main className="settings" />;
  const savingsSet = savings.effective !== null || (savings.source === 'first3' && savings.price !== null);

  return (
    <main className="settings">
      <h1 className="st-title">{t('settings.title')}</h1>
      <SettingsNav active="settings" />

      <h2 className="st-sec" id="language">{t('settings.language')}</h2>
      <LanguageCard />

      <h2 className="st-sec">{t('settings.appearance')}</h2>
      <section className="card st-card">
        <div className="st-block">
          <span id="theme-label" className="st-label">{t('settings.theme')}</span>
          <div className="st-pills" role="radiogroup" aria-labelledby="theme-label">
            {THEMES.map((o) => (
              <button key={o.key} type="button" role="radio" aria-checked={theme === o.key} className="st-pill" onClick={() => setAppearance({ theme: o.key })}>
                {t(o.label)}
              </button>
            ))}
          </div>
        </div>
        <div className="st-divider" />
        <Toggle
          id="high-contrast-mode"
          label={t('settings.highContrast')}
          sub={t('settings.highContrastSub')}
          value={highContrast}
          onChange={(v) => setAppearance({ highContrast: v })}
        />
      </section>

      <h2 className="st-sec">{t('settings.sound')}</h2>
      <section className="card st-card">
        <Toggle
          id="audio-cues"
          label={t('settings.audioCues')}
          sub={t('settings.audioCuesSub')}
          value={audioCues}
          onChange={toggle('audio_cues_enabled', setAudioCues)}
        />
      </section>

      <h2 className="st-sec">{t('settings.milestones')}</h2>
      <section className="card st-card">
        <Toggle
          id="show-clear-day-streak"
          label={t('settings.dayStreak')}
          sub={t('settings.dayStreakSub')}
          value={dayStreak}
          onChange={toggle('day_streak_enabled', setDayStreak)}
        />
      </section>

      <h2 className="st-sec" id="savings">{t('settings.savings')}</h2>
      {savingsSet && !editingSavings ? (
        <section className="card st-card">
          <div className="st-row">
            <div className="st-row-text">
              <span className="st-label">
                {savings.effective
                  ? t('settings.savingsSummary', { n: wholeDrinks(savings.effective.baselinePerWeek), price: priceText(savings.effective.price) })
                  : t('settings.savingsFirst3', { price: priceText(savings.price!) })}
              </span>
              <p className="st-sub">
                {savings.effective ? t('settings.baseline', { baseline: baselineText(savings) }) : t('settings.first3NotYet')}{' '}
                {t('settings.usedBy')}
              </p>
            </div>
          </div>
          <div className="st-divider" />
          <button type="button" className="st-link" onClick={() => setEditingSavings(true)}>
            <span className="st-label">{t('settings.change')}</span>
            <span className="st-chevron" aria-hidden="true">›</span>
          </button>
        </section>
      ) : (
        <SavingsSetup
          initialSource={savings.source}
          initialBaseline={savings.entered}
          initialPrice={savings.price}
          first3={savings.first3}
          canCancel={savingsSet}
          onCancel={() => setEditingSavings(false)}
          onSave={async (src, b, p) => {
            await Promise.all([
              setSetting('savings_baseline_source', src),
              setSetting(PRICE_KEY, String(p)),
              ...(b !== null ? [setSetting(BASELINE_KEY, String(b))] : []),
            ]);
            setSavings(await getSavingsSettings());
            setEditingSavings(false);
          }}
        />
      )}

      <h2 className="st-sec" id="region">{t('settings.region')}</h2>
      <RegionCard key={version} onChange={() => setCurrencyShown((n) => n + 1)} />

      <h2 className="st-sec" id="device">{t('settings.device')}</h2>
      <section className="card st-card st-block">
        <DeviceFields intro={t('settings.deviceIntro')} />
        <p className="st-sub">{t('settings.deviceNote')}</p>
      </section>

      <h2 className="st-sec">{t('settings.reminder')}</h2>
      <ReminderCard />

      <h2 className="st-sec">{t('settings.data')}</h2>
      <section className="card st-card">
        <div className="st-row">
          <div className="st-row-text">
            <span className="st-label">
              {lastBackup ? t('settings.lastBackup', { when: daysAgoText(daysBetween(localDateOf(lastBackup), todayIso())) }) : t('settings.noBackup')}
            </span>
            <p className="st-sub">{t('settings.backupNote')}</p>
          </div>
        </div>
        <div className="st-divider" />
        <Link className="st-link" to="/settings/backup">
          <span className="st-label">{t('settings.backUp')}</span>
          <span className="st-chevron" aria-hidden="true">›</span>
        </Link>
        <div className="st-divider" />
        <Link className="st-link" to="/settings/restore">
          <span className="st-label">{t('settings.restore')}</span>
          <span className="st-chevron" aria-hidden="true">›</span>
        </Link>
        <div className="st-divider" />
        <button type="button" className="st-link" onClick={async () => setEraseCount(await getEntryCount())}>
          <span className="st-label st-danger">{t('settings.erase')}</span>
        </button>
      </section>
      {notice && (
        <p className="st-notice" role="status">
          {notice}
        </p>
      )}

      <h2 className="st-sec">{t('settings.helpResources')}</h2>
      <section className="card st-card">
        <Link className="st-link" to="/settings/help">
          <span className="st-label">{t('settings.help')}</span>
          <span className="st-chevron" aria-hidden="true">›</span>
        </Link>
        <div className="st-divider" />
        <Link className="st-link" to="/settings/resources">
          <span className="st-label">{t('settings.resources')}</span>
          <span className="st-chevron" aria-hidden="true">›</span>
        </Link>
      </section>

      {import.meta.env.DEV && (
        <p className="st-dev">
          <Link to="/dev/colours">{t('settings.colourRef')}</Link> <span className="text-muted">{t('settings.devOnly')}</span>
        </p>
      )}

      <ConfirmDialog
        open={eraseCount !== null}
        title={t('settings.erase')}
        body={t('settings.eraseBody', { count: eraseCount ?? 0 })}
        confirmLabel={t('settings.eraseConfirm')}
        danger
        onCancel={() => setEraseCount(null)}
        onConfirm={async () => {
          await resetDatabase();
          setEraseCount(null);
          setNotice(t('settings.erased'));
          await load();
          setVersion((v) => v + 1);
        }}
      />
    </main>
  );
}

/**
 * Reminders, the web way: in the device's own Reminders or Calendar app.
 * A link back to the app only helps where links open the installed app
 * (Android, and Chrome/Edge on computers). On iPhone/iPad, and Safari on a
 * Mac, a link opens a browser tab with its own, separate record — so no link:
 * the reminder is a nudge to open the app from the Home Screen or Dock.
 */
function ReminderCard() {
  const dev = useDevice();
  const link = `${window.location.origin}${window.location.pathname}`;
  const [copied, setCopied] = useState('');
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(t('reminder.copied'));
    } catch {
      // Clipboard needs a secure page; select the text for a manual copy instead.
      const el = document.getElementById('reminder-link');
      if (el) window.getSelection()?.selectAllChildren(el);
      setCopied(t('reminder.selected'));
    }
  }
  const withLink = linksOpenApp(dev);
  return (
    <section className="card st-card st-block">
      <p className="st-sub st-sub-first">
        {t('reminder.intro', { device: isIos(dev) || isAndroid(dev) ? t('reminder.phone') : t('reminder.computer') })}
      </p>
      {isAndroid(dev) ? (
        <ol className="st-steps">
          <li>{t('reminder.android1')}</li>
          <li>{rich('reminder.android2', { i: (c) => <em>{c}</em> })}</li>
          {withLink && <li>{rich('reminder.android3', { i: (c) => <em>{c}</em> })}</li>}
        </ol>
      ) : isIos(dev) ? (
        <ol className="st-steps">
          <li>{t('reminder.ios1')}</li>
          <li>{rich('reminder.ios2', { i: (c) => <em>{c}</em> })}</li>
          <li>{t('reminder.ios3')}</li>
        </ol>
      ) : (
        <ol className="st-steps">
          <li>{t('reminder.computer1', { app: dev.os === 'mac' ? t('reminder.appMac') : t('reminder.appOther') })}</li>
          {withLink ? (
            <li>{rich('reminder.computerLink', { browser: dev.browser === 'edge' ? 'Edge' : 'Chrome', i: (c) => <em>{c}</em> })}</li>
          ) : (
            <li>{t('reminder.computerOpen', { place: installKeepsOwnRecord(dev) ? t('reminder.placeDock') : t('reminder.placeOther') })}</li>
          )}
        </ol>
      )}
      {withLink && (
        <>
          <div className="st-link-row">
            <code id="reminder-link" className="st-code">{link}</code>
            <button type="button" className="st-copy" onClick={copy}>{t('reminder.copy')}</button>
          </div>
          {copied && <p className="st-sub" role="status">{copied}</p>}
        </>
      )}
      {!withLink && isIos(dev) && (
        <p className="st-sub">{t('reminder.iosNoLink')}</p>
      )}
    </section>
  );
}

/** Region: where help lines and the savings currency come from. Guessed from the time zone until set. */
function RegionCard({ onChange }: { onChange: () => void }) {
  const [region, setRegion] = useState<Region | null>(null);
  const [isSet, setIsSet] = useState(false);
  useEffect(() => {
    getSetting('region', '').then((raw) => {
      setRegion(parseRegion(raw, deviceTimeZone()));
      setIsSet(raw !== '');
    });
  }, []);
  if (!region) return null;
  const save = async (r: Region) => {
    setRegion(r);
    setIsSet(true);
    await setSetting('region', JSON.stringify(r));
    setMoneyCountry(r.country);
    onChange();
  };
  return (
    <section className="card st-card st-block">
      <p className="st-sub st-sub-first">
        {rich('regionCard.decides', { link: (c) => <Link to="/settings/resources">{c}</Link> })}{' '}
        {isSet ? '' : t('regionCard.guessed', { region: regionLabel(region) })}
      </p>
      <RegionFields region={region} onChange={save} />
    </section>
  );
}

/**
 * Language: the device's (when we have it) or one chosen here. Changing it
 * reloads the app, so every screen picks up the new words at once.
 */
function LanguageCard() {
  const [chosen, setChosen] = useState<string | null>(null);
  useEffect(() => {
    getSetting(LANGUAGE_KEY, 'auto').then(setChosen);
  }, []);
  if (chosen === null) return null;
  const device = navigator.languages?.length ? navigator.languages : [navigator.language];
  const auto = LANGUAGES.find((l) => l.code === pickLanguage('auto', device))!;
  return (
    <section className="card st-card st-block">
      <label className="st-field">
        <select
          aria-label={t('settings.languageLabel')}
          className="st-select"
          lang={chosen === 'auto' ? undefined : chosen}
          value={chosen}
          onChange={async (e) => {
            await chooseLanguage(e.target.value);
          }}
        >
          <option value="auto">{t('settings.languageAuto', { language: auto.name })}</option>
          {LANGUAGES.map((l) => <option key={l.code} value={l.code} lang={l.code}>{l.name}</option>)}
        </select>
      </label>
    </section>
  );
}
