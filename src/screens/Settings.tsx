import { useEffect, useState } from 'react';
import { isAndroid, isIos } from '../lib/install';
import { Link, useLocation } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { baselineText, SavingsSetup } from '../components/SavingsCard';
import { getEntryCount, getSavingsSettings, getSetting, resetDatabase, setSetting, type SavingsSettings } from '../data/database';
import { BASELINE_KEY, PRICE_KEY, priceText } from '../lib/savings';
import { daysAgoText } from '../lib/backupNudge';
import { daysBetween, localDateOf, todayIso } from '../data/dates';
import { useAppearance } from '../theme/AppearanceContext';
import type { ThemePref } from '../theme/appearance';
import { SettingsNav } from './About';
import { deviceTimeZone, parseRegion, regionLabel, type Region } from '../lib/regions';
import { RegionFields } from '../components/RegionFields';
import './Settings.css';

// Port of the native app/(tabs)/settings.tsx, adapted for the web:
// - Reminders: instructions for a repeating reminder in the phone's own
//   Reminders app, with a link back (porting plan: no web notifications).
// - App lock: dropped (porting plan).
// - Savings estimate: the baseline and price live here.
// - Descriptions updated to match what high contrast and sounds now do.
// - Erase also resets settings (as native did); the message says so.

const THEMES: { key: ThemePref; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'system', label: 'System' },
];

function Toggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  const id = label.replace(/\W+/g, '-').toLowerCase();
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
      <h1 className="st-title">Settings</h1>
      <SettingsNav active="settings" />

      <h2 className="st-sec">Appearance</h2>
      <section className="card st-card">
        <div className="st-block">
          <span id="theme-label" className="st-label">Theme</span>
          <div className="st-pills" role="radiogroup" aria-labelledby="theme-label">
            {THEMES.map((o) => (
              <button key={o.key} type="button" role="radio" aria-checked={theme === o.key} className="st-pill" onClick={() => setAppearance({ theme: o.key })}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="st-divider" />
        <Toggle
          label="High contrast mode"
          sub="Stronger text, borders and calendar fills"
          value={highContrast}
          onChange={(v) => setAppearance({ highContrast: v })}
        />
      </section>

      <h2 className="st-sec">Sound</h2>
      <section className="card st-card">
        <Toggle
          label="Audio cues"
          sub="A tone for each level when you log a day"
          value={audioCues}
          onChange={toggle('audio_cues_enabled', setAudioCues)}
        />
      </section>

      <h2 className="st-sec">Milestones</h2>
      <section className="card st-card">
        <Toggle
          label="Show clear day streak"
          sub="Counts consecutive clear days. A drinking day resets it to zero, which suits a full break better than moderation."
          value={dayStreak}
          onChange={toggle('day_streak_enabled', setDayStreak)}
        />
      </section>

      <h2 className="st-sec" id="savings">Savings estimate</h2>
      {savingsSet && !editingSavings ? (
        <section className="card st-card">
          <div className="st-row">
            <div className="st-row-text">
              <span className="st-label">
                {savings.effective
                  ? `About ${Math.round(savings.effective.baselinePerWeek * 10) / 10} drinks a week, at ${priceText(savings.effective.price)} a drink`
                  : `First 3 months, at ${priceText(savings.price!)} a drink`}
              </span>
              <p className="st-sub">
                {savings.effective ? `Baseline: ${baselineText(savings)}.` : 'Your first 3 months aren’t measured yet; savings will appear once they are.'}{' '}
                Used by the savings estimate in Trends and Money kept in Milestones.
              </p>
            </div>
          </div>
          <div className="st-divider" />
          <button type="button" className="st-link" onClick={() => setEditingSavings(true)}>
            <span className="st-label">Change</span>
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

      <h2 className="st-sec" id="region">Region</h2>
      <RegionCard key={version} />

      <h2 className="st-sec">Reminder</h2>
      <ReminderCard />

      <h2 className="st-sec">Data</h2>
      <section className="card st-card">
        <div className="st-row">
          <div className="st-row-text">
            <span className="st-label">
              {lastBackup ? `Last backup: ${daysAgoText(daysBetween(localDateOf(lastBackup), todayIso()))}` : 'No backup yet'}
            </span>
            <p className="st-sub">A backup is the only copy of your record outside this browser.</p>
          </div>
        </div>
        <div className="st-divider" />
        <Link className="st-link" to="/settings/export">
          <span className="st-label">Export data</span>
          <span className="st-chevron" aria-hidden="true">›</span>
        </Link>
        <div className="st-divider" />
        <Link className="st-link" to="/settings/import">
          <span className="st-label">Import data</span>
          <span className="st-chevron" aria-hidden="true">›</span>
        </Link>
        <div className="st-divider" />
        <button type="button" className="st-link" onClick={async () => setEraseCount(await getEntryCount())}>
          <span className="st-label st-danger">Erase all data</span>
        </button>
      </section>
      {notice && (
        <p className="st-notice" role="status">
          {notice}
        </p>
      )}

      <h2 className="st-sec">Help and resources</h2>
      <section className="card st-card">
        <Link className="st-link" to="/settings/help">
          <span className="st-label">Help</span>
          <span className="st-chevron" aria-hidden="true">›</span>
        </Link>
        <div className="st-divider" />
        <Link className="st-link" to="/settings/resources">
          <span className="st-label">Resources</span>
          <span className="st-chevron" aria-hidden="true">›</span>
        </Link>
      </section>

      {import.meta.env.DEV && (
        <p className="st-dev">
          <Link to="/dev/colours">Colour reference</Link> <span className="text-muted">(development only)</span>
        </p>
      )}

      <ConfirmDialog
        open={eraseCount !== null}
        title="Erase all data"
        body={`This will permanently delete all ${eraseCount ?? 0} logged day${eraseCount === 1 ? '' : 's'}, your intention history, and your settings. This can't be undone.`}
        confirmLabel="Erase"
        danger
        onCancel={() => setEraseCount(null)}
        onConfirm={async () => {
          await resetDatabase();
          setEraseCount(null);
          setNotice('All data has been erased.');
          await load();
          setVersion((v) => v + 1);
        }}
      />
    </main>
  );
}

/** Reminders, the web way: in the phone's own Reminders app. */
function ReminderCard() {
  const link = `${window.location.origin}${window.location.pathname}`;
  const [copied, setCopied] = useState('');
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied('Link copied.');
    } catch {
      // Clipboard needs a secure page; select the text for a manual copy instead.
      const el = document.getElementById('reminder-link');
      if (el) window.getSelection()?.selectAllChildren(el);
      setCopied('Selected — copy it from the menu.');
    }
  }
  return (
    <section className="card st-card st-block">
      <p className="st-sub st-sub-first">
        Clear Tracker doesn't send notifications. For a daily nudge, set a repeating reminder on your phone — it's
        more reliable, and it's yours:
      </p>
      {isAndroid() ? (
        <ol className="st-steps">
          <li>In Google Calendar, add an event “Log today in Clear Tracker” at a time that suits you.</li>
          <li>Set it to repeat <em>Every day</em>, with a notification at the time of the event.</li>
          <li>Paste this link in the <em>description</em>, so tapping it opens the app.</li>
        </ol>
      ) : (
        <ol className="st-steps">
          <li>In {isIos() ? 'Reminders' : 'your phone’s Reminders app (or a repeating calendar event)'}, add “Log today in Clear Tracker”.</li>
          <li>Open its details: turn on <em>Date</em> and <em>Time</em>, pick a time, and set <em>Repeat</em> to Daily.</li>
          <li>Paste this link in the <em>URL</em> field, so tapping the reminder opens the app.</li>
        </ol>
      )}
      <div className="st-link-row">
        <code id="reminder-link" className="st-code">{link}</code>
        <button type="button" className="st-copy" onClick={copy}>Copy link</button>
      </div>
      {copied && <p className="st-sub" role="status">{copied}</p>}
    </section>
  );
}

/** Region: where help lines (and later, currency and resources) come from. Guessed from the time zone until set. */
function RegionCard() {
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
  };
  return (
    <section className="card st-card st-block">
      <p className="st-sub st-sub-first">
        Decides which help lines and programmes <Link to="/settings/resources">Resources</Link> shows.{' '}
        {isSet ? '' : `Guessed from this device's time zone: ${regionLabel(region)}.`}
      </p>
      <RegionFields region={region} onChange={save} />
    </section>
  );
}
