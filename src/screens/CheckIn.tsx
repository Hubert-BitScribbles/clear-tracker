import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import { HelpLinks } from '../components/HelpLink';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Byline } from '../components/Byline';
import { DayCell } from '../components/DayCell';
import {
  cycleDay,
  getClearDaysInMonth,
  getIntentionsMetInMonth,
  getChallengeStatus,
  getWeekTarget,
  getFirstEntryDate,
  setSetting,
  getMonthCells,
  getSetting,
  getNewMilestones,
  getWeekSummary,
  GLYPH,
  levelOf,
  markMilestonesSeen,
  type Earned,
  nextLevel,
  type DayCell as DayCellData,
  type DayLevel,
} from '../data/database';
import { addDays, daysInMonth, isoOf, mondayOf, todayIso, weekdayOf } from '../data/dates';
import iconUrl from '../assets/clear-icon-96.png';
import { playLoggingSound, unlockAudio } from '../lib/sounds';
import { backupNudge, SNOOZE_DAYS } from '../lib/backupNudge';
import { defaultPeriod } from '../data/report';
import { MONTH_LONG } from '../lib/challengeText';
import { periodLabel } from './Review';
import './CheckIn.css';

// Port of the native app/(tabs)/index.tsx. The second stat card shows weeks
// that met the intention in the shown month (native: week streak, which
// still appears in Trends). And one design change: a tap
// steps a day through clear → a few → moderate → a lot → unlogged, and the
// check-in questions are gone. One native bug fix is marked FIX.

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Shown in the selected-day card. */
const LEVEL_NAME: Record<DayLevel, string> = {
  clear: 'Clear',
  'a-few': 'A few (1–2 drinks)',
  moderate: 'Moderate (3–4 drinks)',
  'a-lot': 'A lot (5+ drinks)',
};
/** Read out by screen readers for each calendar cell. */
const LEVEL_SPOKEN: Record<DayLevel, string> = {
  clear: 'clear',
  'a-few': 'a few drinks',
  moderate: 'moderate, 3 to 4 drinks',
  'a-lot': 'a lot, 5 or more drinks',
};

function formatLongDate(iso: string) {
  const [, m, d] = iso.split('-').map(Number);
  return `${WEEKDAY_NAMES[weekdayOf(iso)]}, ${MONTH_NAMES[m - 1]} ${d}`;
}
const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTH_NAMES[m - 1].slice(0, 3)} ${d}`;
};

interface WeekState {
  clearCount: number;
  hasAny: boolean;
  target: number | null; // null: before the first intention, so not measured
  label: string;
  isCurrent: boolean;
}

export function CheckIn() {
  const today = todayIso();
  const [params, setParams] = useSearchParams();
  const [year, setYear] = useState(() => Number(params.get('year')) || Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(params.get('month')) || Number(today.slice(5, 7)));
  const [entries, setEntries] = useState<Record<string, DayCellData>>({});
  const [selected, setSelected] = useState(today);
  const [audioCues, setAudioCues] = useState(true);
  const [monthClearCount, setMonthClearCount] = useState(0);
  const [monthMet, setMonthMet] = useState({ met: 0, counted: 0 });
  // A chosen clear month under way: "Clear January · day 12". Gone quietly
  // after a drinking day (it can't be earned any more), with no message.
  const [challengeLine, setChallengeLine] = useState<string | null>(null);
  const refreshChallenge = useCallback(async () => {
    const st = await getChallengeStatus();
    const toLog = (n: number) => (n ? ` · ${n} day${n === 1 ? '' : 's'} to log` : '');
    // A chosen month first, then a week, then a weekend — whichever is under way.
    const m = st.months.find((x) => x.state === 'under-way');
    if (m && m.state === 'under-way') return setChallengeLine(`Clear ${MONTH_LONG[Number(m.ym.slice(5, 7)) - 1]} · day ${m.day}${toLog(m.toLog)}`);
    for (const [kind, span, len] of [['week', st.weekNow, 7], ['weekend', st.weekendNow, 3]] as const) {
      if (span?.state === 'under-way') {
        const day = Math.round((Date.parse(`${todayIso()}T00:00:00Z`) - Date.parse(`${span.first}T00:00:00Z`)) / 86_400_000) + 1;
        return setChallengeLine(`Clear ${kind} · day ${day} of ${len}${toLog(span.toLog)}`);
      }
    }
    setChallengeLine(null);
  }, []);

  // A milestone just earned: its own title, a link to Milestones, and ✕.
  // Shown one at a time, newest first; opening or dismissing it marks it seen.
  const [newMilestone, setNewMilestone] = useState<Earned | null>(null);
  const refreshMilestone = useCallback(async () => {
    const fresh = await getNewMilestones();
    setNewMilestone(fresh[0] ?? null);
  }, []);
  const seeMilestone = async (m: Earned) => {
    await markMilestonesSeen([m.title]);
    refreshMilestone();
  };
  const [pickerOpen, setPickerOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [week, setWeek] = useState<WeekState>({
    clearCount: 0, hasAny: false, target: 3, label: 'This week', isCurrent: true,
  });
  const [weekVersion, setWeekVersion] = useState(0);

  // Other screens can open a given month: #/?year=2026&month=3.
  // Read once, then cleared from the address, as native does.
  useEffect(() => {
    if (params.has('year') || params.has('month')) setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // As native: until onboarding is done, Check-in sends you there.
  const navigate = useNavigate();
  useEffect(() => {
    getSetting('onboarding_complete', 'false').then((v) => v !== 'true' && navigate('/onboarding', { replace: true }));
  }, [navigate]);

  // Coming back to the app on a later day (it may have stayed open in the
  // background overnight): move to the new today. Native used AppState.
  const [shownToday, setShownToday] = useState(today);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const now = todayIso();
      if (now === shownToday) return;
      setShownToday(now);
      setSelected(now);
      setYear(Number(now.slice(0, 4)));
      setMonth(Number(now.slice(5, 7)));
      load(Number(now.slice(0, 4)), Number(now.slice(5, 7)));
      setWeekVersion((v) => v + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownToday]);

  const [nudge, setNudge] = useState<ReturnType<typeof backupNudge>>(null);
  useEffect(() => {
    Promise.all([getSetting('last_backup_at', ''), getFirstEntryDate(), getSetting('backup_nudge_snooze_until', '')]).then(
      ([lb, first, snooze]) => setNudge(backupNudge(shownToday, lb || null, first, snooze || null)),
    );
  }, [shownToday]);

  // "Your August in review is ready": the first week of a month, if last month
  // has logged days and its review hasn't been opened or dismissed.
  const [reviewNote, setReviewNote] = useState<string | null>(null);
  const lastMonth = defaultPeriod(shownToday);
  const seenKey = `report_seen_${lastMonth.year}-${String(lastMonth.month).padStart(2, '0')}`;
  useEffect(() => {
    if (Number(shownToday.slice(8, 10)) > 7) return setReviewNote(null);
    Promise.all([getSetting(seenKey, ''), getMonthCells(lastMonth.year, lastMonth.month!)]).then(([seen, cells]) =>
      setReviewNote(seen === '' && Object.keys(cells).length > 0 ? periodLabel(lastMonth) : null),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownToday, seenKey]);

  const loadId = useRef(0);
  const load = useCallback(async (y: number, m: number) => {
    const id = ++loadId.current; // ignore results from an older request
    const [cells, cues, mCount, mMet] = await Promise.all([
      getMonthCells(y, m),
      getSetting('audio_cues_enabled', 'true'),
      getClearDaysInMonth(y, m),
      getIntentionsMetInMonth(y, m),
    ]);
    if (id !== loadId.current) return;
    setEntries(cells);
    setAudioCues(cues === 'true');
    setMonthClearCount(mCount);
    setMonthMet(mMet);
    refreshChallenge();
    refreshMilestone();
    setReady(true);
  }, []);

  useEffect(() => {
    load(year, month);
  }, [load, year, month]);

  // The alignment card follows whichever day is selected.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const start = mondayOf(selected);
      const end = addDays(start, 6);
      const [summary, target] = await Promise.all([getWeekSummary(start, end), getWeekTarget(start)]);
      if (cancelled) return;
      const isCurrent = start === mondayOf(todayIso());
      setWeek({
        clearCount: summary.clearCount,
        hasAny: summary.hasEntries,
        target,
        isCurrent,
        label: isCurrent ? 'This week' : `Week of ${shortDate(start)}–${shortDate(end)}`,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, weekVersion]);

  // ---- Alignment card ------------------------------------------------------
  let barColor = 'var(--align-unlogged)';
  let cardNote: string;
  let icon: 'check' | 'sparkle' | null = null;
  const { clearCount, target } = week;
  const thisThat = week.isCurrent ? 'this' : 'that';
  const days = (n: number) => `${n} clear day${n === 1 ? '' : 's'}`;
  if (target === null) {
    // Logged from before the app was first used: nothing to measure against.
    cardNote = 'Before your first intention, so this week isn’t measured.';
  } else if (week.hasAny) {
    if (clearCount >= target) {
      const beyond = clearCount > target;
      barColor = beyond ? 'var(--align-exceeded)' : 'var(--align-met)';
      icon = beyond ? 'sparkle' : 'check';
      cardNote = beyond ? `Beyond your intention ${thisThat} week.` : `Intention met ${thisThat} week.`;
    } else {
      barColor = 'var(--align-partial)';
      cardNote = week.isCurrent
        ? `${days(clearCount)} so far — ${target - clearCount} more to go this week.`
        : `${days(clearCount)} that week.`;
    }
  } else {
    cardNote = week.isCurrent ? `Nothing logged yet this week. Aiming for ${target}.` : 'Nothing was logged that week.';
  }
  const barPct = week.hasAny && target ? Math.min(100, Math.round((clearCount / target) * 100)) : 0;

  // Render at the old width first so the width change animates (500ms).
  const [shownPct, setShownPct] = useState(0);
  useEffect(() => {
    const f = requestAnimationFrame(() => setShownPct(barPct));
    return () => cancelAnimationFrame(f);
  }, [barPct]);

  // ---- Actions -------------------------------------------------------------
  async function handleTap(iso: string) {
    if (iso > today) return;
    if (selected !== iso) {
      setSelected(iso);
      return;
    }
    // Must happen now, inside the tap, before the await below.
    if (audioCues) unlockAudio();
    const next = await cycleDay(iso, levelOf(entries[iso]));
    setEntries((prev) => {
      const copy = { ...prev };
      if (next === null) delete copy[iso];
      else copy[iso] = next === 'clear' ? { status: 'clear', amount: null } : { status: 'drinking', amount: next };
      return copy;
    });
    if (audioCues && next) playLoggingSound(next); // back to unlogged is silent
    setWeekVersion((v) => v + 1); // refresh the alignment card
    // FIX: native refreshed only the alignment card here, so the stat cards
    // stayed stale until the tab was left and reopened. Both now update with
    // every tap.
    const [mCount, mMet] = await Promise.all([getClearDaysInMonth(year, month), getIntentionsMetInMonth(year, month)]);
    setMonthClearCount(mCount);
    setMonthMet(mMet);
    refreshChallenge();
    refreshMilestone();
  }

  function goMonth(delta: number) {
    setPickerOpen(false);
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  // Swipe the calendar sideways to change month (the arrows still work).
  // A tap on a day never moves more than a few pixels, so the two don't clash;
  // a mostly-vertical move is left to scroll the page.
  const swipe = useRef<{ x: number; y: number } | null>(null);
  function swipeStart(e: TouchEvent<HTMLDivElement>) {
    const t = e.touches[0];
    swipe.current = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
  }
  function swipeEnd(e: TouchEvent<HTMLDivElement>) {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) goMonth(dx < 0 ? 1 : -1);
  }

  function goToday() {
    setPickerOpen(false);
    const t = todayIso();
    setYear(Number(t.slice(0, 4)));
    setMonth(Number(t.slice(5, 7)));
    setSelected(t);
  }

  // ---- Render --------------------------------------------------------------
  if (!ready) return <main className="checkin" />;

  const offset = (weekdayOf(isoOf(year, month, 1)) + 6) % 7; // Monday-first
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth(year, month); d++) cells.push(isoOf(year, month, d));

  const selLevel = levelOf(entries[selected]);
  const selNext = selLevel ? nextLevel(selLevel) : null;

  return (
    <main className="checkin">
      <div className="ci-title-row">
        <img className="ci-app-icon" src={iconUrl} alt="" width="28" height="28" />
        <span className="ci-app-title">Clear Tracker</span>
      </div>
      <div className="ci-byline">
        <Byline />
      </div>
      <h1 className="ci-title">Check-in</h1>
      {challengeLine && <p className="ci-challenge">{challengeLine}</p>}
      {newMilestone && (
        <div className="ci-milestone" role="status">
          <Link className="ci-milestone-link" to="/milestones" onClick={() => markMilestonesSeen([newMilestone.title])}>
            <span className="ci-milestone-glyph" aria-hidden="true">{GLYPH[newMilestone.kind]}</span> {newMilestone.title}
          </Link>
          <button type="button" className="ci-milestone-x" aria-label={`Dismiss: ${newMilestone.title}`} onClick={() => seeMilestone(newMilestone)}>
            ✕
          </button>
        </div>
      )}

      {reviewNote && (
        <div className="card ci-note" role="note">
          <p className="ci-note-text">Your {reviewNote.split(' ')[0]} in review is ready.</p>
          <div className="ci-note-actions">
            <Link className="ci-note-link" to={`/trends/review?year=${lastMonth.year}&month=${lastMonth.month}`}>Open it</Link>
            <button
              type="button"
              className="ci-note-later"
              onClick={async () => {
                await setSetting(seenKey, 'dismissed');
                setReviewNote(null);
              }}
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {nudge && (
        <div className="card ci-note" role="note">
          <p className="ci-note-text">
            {nudge.kind === 'never'
              ? `You have ${nudge.days} days of records and no backup yet.`
              : `It's been ${nudge.days} days since your last backup.`}{' '}
            A backup is the only copy outside this browser.
          </p>
          <div className="ci-note-actions">
            <Link className="ci-note-link" to="/settings/backup">Back up now</Link>
            <button
              type="button"
              className="ci-note-later"
              onClick={async () => {
                await setSetting('backup_nudge_snooze_until', addDays(shownToday, SNOOZE_DAYS));
                setNudge(null);
              }}
            >
              Later
            </button>
          </div>
        </div>
      )}

      <div className="ci-stats">
        <div className="card ci-stat">
          <p className="ci-stat-label">Clear days in {MONTH_NAMES[month - 1]}</p>
          <p className="ci-stat-value">{monthClearCount}</p>
        </div>
        <div className="card ci-stat">
          <p className="ci-stat-label">Intentions met in {MONTH_NAMES[month - 1]}</p>
          {/* Weeks belong to the month with their Thursday. Before the month
              has any weeks, a dash rather than a bold "0". */}
          <p className="ci-stat-value">
            {monthMet.counted ? `${monthMet.met} of ${monthMet.counted}` : '—'}
          </p>
        </div>
      </div>

      <div className="ci-month-header">
        <button type="button" className="ci-arrow" onClick={() => goMonth(-1)} aria-label="Previous month">
          ‹
        </button>
        <button
          type="button"
          className="ci-month-title"
          onClick={() => setPickerOpen((o) => !o)}
          aria-expanded={pickerOpen}
        >
          {MONTH_NAMES[month - 1]} {year}
        </button>
        <div className="ci-month-right">
          <button type="button" className="ci-arrow" onClick={() => goMonth(1)} aria-label="Next month">
            ›
          </button>
          <button type="button" className="ci-today" onClick={goToday}>
            Today
          </button>
        </div>
      </div>

      {pickerOpen && (
        <div className="card ci-picker">
          <div className="ci-picker-year">
            <button type="button" className="ci-arrow" onClick={() => setYear((y) => y - 1)} aria-label="Previous year">
              ‹
            </button>
            <span className="ci-picker-year-label">{year}</span>
            <button type="button" className="ci-arrow" onClick={() => setYear((y) => y + 1)} aria-label="Next year">
              ›
            </button>
          </div>
          <div className="ci-picker-grid">
            {MONTH_NAMES.map((name, idx) => (
              <button
                key={name}
                type="button"
                className="ci-picker-month"
                aria-pressed={idx + 1 === month}
                aria-label={name}
                onClick={() => {
                  setMonth(idx + 1);
                  setPickerOpen(false);
                }}
              >
                {name.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}

      <Link to="/intention" className="card ci-align" aria-label={`Intention: ${week.label}, ${target === null ? days(clearCount) : `${clearCount} of ${target} clear days`}. ${cardNote} Change intention`}>
        <div className="ci-row-between ci-align-head">
          <h2 className="ci-align-title">Intention</h2>
          <span className="ci-align-change" aria-hidden="true">Change ›</span>
        </div>
        <div className="ci-row-between">
          <span className="ci-secondary">{week.label}</span>
          <span className="ci-week-count">
            {icon && (
              <span key={`${icon}-${clearCount}`} className="ci-icon-glyph" aria-hidden="true">
                {icon === 'check' ? '✓' : '✦'}
              </span>
            )}
            {target === null ? days(clearCount) : `${clearCount} of ${target} clear days`}
          </span>
        </div>
        {target !== null && (
          <div className="ci-track">
            <div className="ci-fill" style={{ width: `${shownPct}%`, background: barColor }} />
          </div>
        )}
        <p className="ci-align-note">{cardNote}</p>
      </Link>

      <div className="ci-weekdays" aria-hidden="true">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div className="ci-grid" onTouchStart={swipeStart} onTouchEnd={swipeEnd}>
        {cells.map((iso, i) => {
          if (!iso) return <div key={`pad-${i}`} className="day-cell" aria-hidden="true" />;
          const level = levelOf(entries[iso]);
          const label =
            `${formatLongDate(iso)}${iso === today ? ', today' : ''}, ` +
            (level ? LEVEL_SPOKEN[level] : 'not logged');
          return (
            <DayCell
              key={iso}
              day={Number(iso.slice(8, 10))}
              level={level}
              selected={selected === iso}
              future={iso > today}
              isToday={iso === today}
              label={label}
              onClick={() => handleTap(iso)}
            />
          );
        })}
      </div>

      <div className="ci-legend">
        <span className="ci-legend-item">
          <span className="ci-swatch" style={{ background: 'var(--clear-fill)' }} />
          Clear day
        </span>
        <span className="ci-legend-item">
          <span className="ci-swatch ci-swatch-a-few" />
          A few
        </span>
        <span className="ci-legend-item">
          <span className="ci-swatch" style={{ background: 'var(--drinking-fill)' }} />
          Moderate · A lot
        </span>
        <span className="ci-legend-item">
          <span className="ci-swatch ci-swatch-unlogged" />
          Unlogged
        </span>
      </div>

      <section className="card ci-details" aria-live="polite">
        <h2 className="ci-details-date">{formatLongDate(selected)}</h2>
        <p className="ci-secondary">
          {selLevel
            ? `Selected · ${LEVEL_NAME[selLevel]} — tap again for ${
                selNext ? LEVEL_NAME[selNext].split(' (')[0] : 'unlogged'
              }`
            : 'Not logged yet — tap this day again to mark it clear'}
        </p>
      </section>

      <HelpLinks topic="start">How logging works</HelpLinks>
    </main>
  );
}
