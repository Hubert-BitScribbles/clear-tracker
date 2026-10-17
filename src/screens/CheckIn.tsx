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
import './CheckIn.css';
import { t } from '../i18n';
import { dayMonth, monthName, monthYear, weekdayDayMonthLong, weekdayLetter } from '../i18n/format';

// Port of the native app/(tabs)/index.tsx. The second stat card shows weeks
// that met the intention in the shown month (native: week streak, which
// still appears in Trends). And one design change: a tap
// steps a day through clear → a few → moderate → a lot → unlogged, and the
// check-in questions are gone. One native bug fix is marked FIX.

/** Shown in the selected-day card. */
const levelName = (l: DayLevel) => t(`checkin.level.${l}`);
/** The level alone, for "tap again for Moderate". */
const levelShort = (l: DayLevel) => t(LEVEL_KEY[l]);
const LEVEL_KEY = { clear: 'level.clear', 'a-few': 'level.aFew', moderate: 'level.moderate', 'a-lot': 'level.aLot' } as const;
/** Read out by screen readers for each calendar cell. */
const levelSpoken = (l: DayLevel | null) => t(`checkin.spoken.${l ?? 'unlogged'}`);

const formatLongDate = weekdayDayMonthLong;
const shortDate = dayMonth;
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

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
    const toLog = (n: number) => (n ? t('checkin.toLog', { count: n }) : '');
    // A chosen month first, then a week, then a weekend — whichever is under way.
    const m = st.months.find((x) => x.state === 'under-way');
    if (m && m.state === 'under-way') return setChallengeLine(t('checkin.challengeMonth', { month: monthName(Number(m.ym.slice(5, 7))), day: m.day, toLog: toLog(m.toLog) }));
    for (const [kind, span, len] of [['week', st.weekNow, 7], ['weekend', st.weekendNow, 3]] as const) {
      if (span?.state === 'under-way') {
        const day = Math.round((Date.parse(`${todayIso()}T00:00:00Z`) - Date.parse(`${span.first}T00:00:00Z`)) / 86_400_000) + 1;
        return setChallengeLine(t(`checkin.challengeSpan.${kind}`, { day, len, toLog: toLog(span.toLog) }));
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
    clearCount: 0, hasAny: false, target: 3, label: t('checkin.thisWeek'), isCurrent: true,
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
      setReviewNote(seen === '' && Object.keys(cells).length > 0 ? monthName(lastMonth.month!) : null),
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
        label: isCurrent ? t('checkin.thisWeek') : t('checkin.weekOf', { start: shortDate(start), end: shortDate(end) }),
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
  const days = (n: number) => t('checkin.clearDays', { count: n });
  if (target === null) {
    // Logged from before the app was first used: nothing to measure against.
    cardNote = t('checkin.beforeIntention');
  } else if (week.hasAny) {
    if (clearCount >= target) {
      const beyond = clearCount > target;
      barColor = beyond ? 'var(--align-exceeded)' : 'var(--align-met)';
      icon = beyond ? 'sparkle' : 'check';
      cardNote = beyond ? t(week.isCurrent ? 'checkin.beyondThis' : 'checkin.beyondThat') : t(week.isCurrent ? 'checkin.metThis' : 'checkin.metThat');
    } else {
      barColor = 'var(--align-partial)';
      cardNote = week.isCurrent
        ? t('checkin.soFar', { days: days(clearCount), left: target - clearCount })
        : t('checkin.thatWeek', { days: days(clearCount) });
    }
  } else {
    cardNote = week.isCurrent ? t('checkin.nothingYet', { target }) : t('checkin.nothingThatWeek');
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
    const touch = e.touches[0];
    swipe.current = e.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
  }
  function swipeEnd(e: TouchEvent<HTMLDivElement>) {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - s.x;
    const dy = touch.clientY - s.y;
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) goMonth(dx < 0 ? 1 : -1);
  }

  function goToday() {
    setPickerOpen(false);
    const now = todayIso();
    setYear(Number(now.slice(0, 4)));
    setMonth(Number(now.slice(5, 7)));
    setSelected(now);
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
      <h1 className="ci-title">{t('checkin.title')}</h1>
      {challengeLine && <p className="ci-challenge">{challengeLine}</p>}
      {newMilestone && (
        <div className="ci-milestone" role="status">
          <Link className="ci-milestone-link" to="/milestones" onClick={() => markMilestonesSeen([newMilestone.title])}>
            <span className="ci-milestone-glyph" aria-hidden="true">{GLYPH[newMilestone.kind]}</span> {newMilestone.title}
          </Link>
          <button type="button" className="ci-milestone-x" aria-label={t('checkin.dismiss', { title: newMilestone.title })} onClick={() => seeMilestone(newMilestone)}>
            ✕
          </button>
        </div>
      )}

      {reviewNote && (
        <div className="card ci-note" role="note">
          <p className="ci-note-text">{t('checkin.reviewReady', { month: reviewNote })}</p>
          <div className="ci-note-actions">
            <Link className="ci-note-link" to={`/trends/review?year=${lastMonth.year}&month=${lastMonth.month}`}>{t('checkin.openIt')}</Link>
            <button
              type="button"
              className="ci-note-later"
              onClick={async () => {
                await setSetting(seenKey, 'dismissed');
                setReviewNote(null);
              }}
            >
              {t('checkin.notNow')}
            </button>
          </div>
        </div>
      )}

      {nudge && (
        <div className="card ci-note" role="note">
          <p className="ci-note-text">
            {nudge.kind === 'never'
              ? t('checkin.nudgeNever', { days: nudge.days })
              : t('checkin.nudgeSince', { days: nudge.days })}{' '}
            {t('checkin.nudgeWhy')}
          </p>
          <div className="ci-note-actions">
            <Link className="ci-note-link" to="/settings/backup">{t('checkin.backUpNow')}</Link>
            <button
              type="button"
              className="ci-note-later"
              onClick={async () => {
                await setSetting('backup_nudge_snooze_until', addDays(shownToday, SNOOZE_DAYS));
                setNudge(null);
              }}
            >
              {t('checkin.later')}
            </button>
          </div>
        </div>
      )}

      <div className="ci-stats">
        <div className="card ci-stat">
          <p className="ci-stat-label">{t('checkin.clearDaysIn', { month: monthName(month) })}</p>
          <p className="ci-stat-value">{monthClearCount}</p>
        </div>
        <div className="card ci-stat">
          <p className="ci-stat-label">{t('checkin.metIn', { month: monthName(month) })}</p>
          {/* Weeks belong to the month with their Thursday. Before the month
              has any weeks, a dash rather than a bold "0". */}
          <p className="ci-stat-value">
            {monthMet.counted ? t('checkin.metOf', { met: monthMet.met, counted: monthMet.counted }) : '—'}
          </p>
        </div>
      </div>

      <div className="ci-month-header">
        <button type="button" className="ci-arrow" onClick={() => goMonth(-1)} aria-label={t('chart.previousMonth')}>
          ‹
        </button>
        <button
          type="button"
          className="ci-month-title"
          onClick={() => setPickerOpen((o) => !o)}
          aria-expanded={pickerOpen}
        >
          {monthYear(month, year)}
        </button>
        <div className="ci-month-right">
          <button type="button" className="ci-arrow" onClick={() => goMonth(1)} aria-label={t('chart.nextMonth')}>
            ›
          </button>
          <button type="button" className="ci-today" onClick={goToday}>
            {t('checkin.today')}
          </button>
        </div>
      </div>

      {pickerOpen && (
        <div className="card ci-picker">
          <div className="ci-picker-year">
            <button type="button" className="ci-arrow" onClick={() => setYear((y) => y - 1)} aria-label={t('checkin.previousYear')}>
              ‹
            </button>
            <span className="ci-picker-year-label">{year}</span>
            <button type="button" className="ci-arrow" onClick={() => setYear((y) => y + 1)} aria-label={t('checkin.nextYear')}>
              ›
            </button>
          </div>
          <div className="ci-picker-grid">
            {MONTHS.map((m) => (
              <button
                key={m}
                type="button"
                className="ci-picker-month"
                aria-pressed={m === month}
                aria-label={monthName(m)}
                onClick={() => {
                  setMonth(m);
                  setPickerOpen(false);
                }}
              >
                {monthName(m, 'short')}
              </button>
            ))}
          </div>
        </div>
      )}

      <Link to="/intention" className="card ci-align" aria-label={t('checkin.cardLabel', { week: week.label, count: target === null ? days(clearCount) : t('checkin.weekCount', { count: clearCount, target }), note: cardNote })}>
        <div className="ci-row-between ci-align-head">
          <h2 className="ci-align-title">{t('checkin.intention')}</h2>
          <span className="ci-align-change" aria-hidden="true">{t('checkin.change')}</span>
        </div>
        <div className="ci-row-between">
          <span className="ci-secondary">{week.label}</span>
          <span className="ci-week-count">
            {icon && (
              <span key={`${icon}-${clearCount}`} className="ci-icon-glyph" aria-hidden="true">
                {icon === 'check' ? '✓' : '✦'}
              </span>
            )}
            {target === null ? days(clearCount) : t('checkin.weekCount', { count: clearCount, target })}
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
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <span key={d}>{weekdayLetter(d)}</span>
        ))}
      </div>

      <div className="ci-grid" onTouchStart={swipeStart} onTouchEnd={swipeEnd}>
        {cells.map((iso, i) => {
          if (!iso) return <div key={`pad-${i}`} className="day-cell" aria-hidden="true" />;
          const level = levelOf(entries[iso]);
          const label = t('checkin.cellLabel', { date: formatLongDate(iso), today: iso === today ? t('checkin.cellToday') : '', level: levelSpoken(level) });
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
          {t('checkin.legend.clear')}
        </span>
        <span className="ci-legend-item">
          <span className="ci-swatch ci-swatch-a-few" />
          {t('level.aFew')}
        </span>
        <span className="ci-legend-item">
          <span className="ci-swatch" style={{ background: 'var(--drinking-fill)' }} />
          {t('level.moderate')}
        </span>
        <span className="ci-legend-item">
          <span className="ci-swatch" style={{ background: 'var(--lot-fill)' }} />
          {t('level.aLot')}
        </span>
        <span className="ci-legend-item">
          <span className="ci-swatch ci-swatch-unlogged" />
          {t('checkin.legend.unlogged')}
        </span>
      </div>

      <section className="card ci-details" aria-live="polite">
        <h2 className="ci-details-date">{formatLongDate(selected)}</h2>
        <p className="ci-secondary">
          {selLevel
            ? t('checkin.selected', { level: levelName(selLevel), next: selNext ? levelShort(selNext) : t('checkin.unloggedWord') })
            : t('checkin.notLogged')}
        </p>
      </section>

      <HelpLinks topic="start">{t('checkin.help')}</HelpLinks>
    </main>
  );
}
