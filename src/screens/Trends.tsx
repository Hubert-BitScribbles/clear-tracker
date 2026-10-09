import { useEffect, useState } from 'react';
import { HelpLinks } from '../components/HelpLink';
import { Link } from 'react-router-dom';
import {
  getBackupData,
  getBestStreaks,
  getCurrentClearDayStreak,
  getCurrentStreak,
  getDayOfWeekLevels,
  getDaysAvailable,
  getFirstEntryDate,
  getSetting,
  getWeeksForYear,
  getYearsWithEntries,
  type DayOfWeekLevels,
} from '../data/database';
import { daysBetween, daysInMonth, isoOf, mondayOf, todayIso, yearOf } from '../data/dates';
import { Data as Snapshot, weeksMetCount } from '../data/compute';
import { SavingsCard } from '../components/SavingsCard';
import { TrendsNav } from '../components/SegmentNav';
import { LevelLegend } from '../components/LevelLegend';
import { buildReport, sameStretchLastYear, summarizeRange, weekdaySummary } from '../data/report';
import { ALIGNMENT_NAMES, alignmentOf, IntentionChart, type MeasuredWeek } from '../components/IntentionChart';
import { comparisonText, drinksText, typicalDayText, wholeDrinks } from '../lib/reportText';
import { momentumIncludes } from '../data/baseline';
import { chartMonths, monthlyRates, SIX_MONTHS, THREE_MONTHS, windowChange, type DrinksEstimate } from '../data/trend';
import { MonthlyChart } from '../components/MonthlyChart';
import { challengeNote, drinksChangeText, ML, monthVsPrevious, type DrinksTrend } from '../lib/trendText';
import { chosenMonthRanges, getChallenges } from '../data/database';
import './Trends.css';

// Port of the native app/(tabs)/trends.tsx. Differences:
// - The "Check-in responses" section is gone, with the check-in questions.
// - "Days tracked: X of Y" uses whole-day date maths (see daysAvailable).
// - ✓ and ✦ on week chips use colours that pass contrast (see tokens.css).
// - The current week no longer vanishes at the end of a month (FIX below).
// - Day-of-week bars split drinking days into "A few" and the rest, and
//   each month in the intention grid shows its clear-day count.
// - New: estimated savings against a baseline (SavingsCard), shown above
//   the day-of-week section.
// - Streak cards follow the selected year: a past year shows its best; the
//   current year shows now, and its best beneath.
// - From the month/year in review: an "At a glance" card (clear days with a
//   comparison, days logged, weeks met), estimated drinks per week, and
//   month-by-month bars (year-by-year under All time).
// - Intention: weekly bars against the target (IntentionChart), replacing
//   the chip grid; per-month clear counts now live in Month by month.

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type Scope = number | 'all';

const labelFor = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTH_SHORT[m - 1]} ${d}`;
};

interface Data {
  years: number[];
  dayStreak: number;
  weekStreak: number;
  bestDayStreak: number;
  bestWeekStreak: number;
  showDayStreak: boolean;
  hasEntries: boolean;
  total: number;
  trackedDays: number;
  availableDays: number;
  weeksMet: number;
  weeksCounted: number;
  compare: { before: number; label: string } | null;
  levels: Record<'clear' | 'a-few' | 'moderate' | 'a-lot', number>;
  drinksPerWeek: DrinksEstimate | null;
  rows: { label: string; clear: number; aFew: number; more: number; available: number; start: string; end: string; year: number; month: number | null }[];
  snap: Snapshot;
  trend: DrinksTrend;
  rangeStart: string;
  rangeEnd: string;
  dowStats: DayOfWeekLevels[];
  weeks: MeasuredWeek[];
  intentionStart: string | null;
}

export function Trends() {
  const thisYear = yearOf(todayIso());
  const [scope, setScope] = useState<Scope>(thisYear);
  const [data, setData] = useState<Data | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const [rowSel, setRowSel] = useState<string | null>(null);
  const [dowSel, setDowSel] = useState<number | null>(null);

  // The intention grid always needs a concrete year: under "All time" it
  // shows the current year and says so in its heading.
  const alignmentYear = scope === 'all' ? thisYear : scope;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const scopeYear = scope === 'all' ? undefined : scope;
      const today = todayIso();
      const [years, ds, ws, best, dow, wy, dsOn, first, available, all] = await Promise.all([
        getYearsWithEntries(),
        getCurrentClearDayStreak(),
        getCurrentStreak(),
        getBestStreaks(scope),
        getDayOfWeekLevels(scopeYear),
        getWeeksForYear(alignmentYear),
        getSetting('day_streak_enabled', 'false'),
        getFirstEntryDate(),
        getDaysAvailable(scope),
        getBackupData(),
      ]);
      if (cancelled) return;
      const d = new Snapshot({ entries: all.dayEntries, intentions: all.intentions });
      let glance: Pick<Data, 'total' | 'trackedDays' | 'weeksMet' | 'weeksCounted' | 'compare' | 'levels' | 'drinksPerWeek' | 'rows' | 'rangeStart' | 'rangeEnd'>;
      const clip = (iso: string) => (iso < today ? iso : today);
      // Days that could have been logged: from the first logged day on. Days
      // before tracking began aren't "not logged", they're before it started.
      const daysSinceStart = (start: string, end: string) => {
        const from = first && first > start ? first : start;
        return from > end ? 0 : daysBetween(from, end) + 1;
      };
      if (scope === 'all') {
        const sum = summarizeRange(d, first ?? today, today);
        glance = {
          total: sum.levels.clear,
          trackedDays: sum.logged,
          weeksMet: weeksMetCount(d, today),
          weeksCounted: d.intentionWeeks(today).length,
          compare: null,
          levels: sum.levels,
          drinksPerWeek: sum.drinksPerWeek,
          rows: [...years].reverse().map((y) => {
            const r = summarizeRange(d, isoOf(y, 1, 1), isoOf(y, 12, 31));
            return {
              label: String(y), clear: r.levels.clear, aFew: r.levels['a-few'], more: r.levels.moderate + r.levels['a-lot'],
              available: daysSinceStart(isoOf(y, 1, 1), clip(isoOf(y, 12, 31))), start: isoOf(y, 1, 1), end: clip(isoOf(y, 12, 31)), year: y, month: null,
            };
          }),
          rangeStart: first ?? today,
          rangeEnd: today,
        };
      } else {
        const r = buildReport(d, { year: scope, month: null }, today, null);
        let compare: Data['compare'] = null;
        if (r.complete && r.previous) compare = { before: r.previous.clear, label: String(scope - 1) };
        if (!r.complete) {
          const last = sameStretchLastYear(r.start, r.end);
          const prev = summarizeRange(d, last.start, last.end);
          // As in the report: only if tracking had begun by the start of that stretch.
          if (prev.logged > 0 && first !== null && first <= last.start) compare = { before: prev.levels.clear, label: 'the same time last year' };
        }
        glance = {
          total: r.levels.clear,
          trackedDays: r.logged,
          weeksMet: r.weeks.met,
          weeksCounted: r.weeks.counted,
          compare,
          levels: r.levels,
          drinksPerWeek: r.drinksPerWeek,
          rows: r.months
            .filter((m) => isoOf(scope, m.month, 1) <= today)
            .map((m) => {
              const end = clip(new Date(Date.UTC(scope, m.month, 0)).toISOString().slice(0, 10));
              const available = daysSinceStart(isoOf(scope, m.month, 1), end);
              return { label: MONTH_SHORT[m.month - 1], clear: m.clear, aFew: m.aFew, more: m.more, available, start: isoOf(scope, m.month, 1), end, year: scope, month: m.month };
            }),
          rangeStart: r.start,
          rangeEnd: r.end,
        };
      }
      const currentMonday = mondayOf(today);
      setData({
        years,
        dayStreak: ds,
        weekStreak: ws,
        bestDayStreak: best.day,
        bestWeekStreak: best.week,
        showDayStreak: dsOn === 'true',
        hasEntries: !!first,
        availableDays: available,
        ...glance,
        snap: d,
        // About now, so only for the current year and All time.
        trend: await (async () => {
          // Trend statements are about now: current year and All time only.
          const now = scope === 'all' || scope === yearOf(today);
          const ranges = chosenMonthRanges(await getChallenges());
          return {
            points: monthlyRates(d, today, chartMonths(today, scope)),
            three: now ? windowChange(d, today, THREE_MONTHS, 30) : null,
            six: now ? windowChange(d, today, SIX_MONTHS, 60) : null,
            notes: { three: momentumIncludes(today, ranges, THREE_MONTHS), six: momentumIncludes(today, ranges, SIX_MONTHS) },
          };
        })(),
        dowStats: dow,
        // From the first logged week to now. Weeks before the first intention
        // are shown (neutral, with their clear days) but not measured.
        weeks: wy.filter((w) => w.weekStartIso <= currentMonday && !!d.earliest && w.weekStartIso >= mondayOf(d.earliest)),
        intentionStart: d.intentionStart,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [scope, alignmentYear]);

  if (!data) return <main className="trends" />;

  const scopeLabel = scope === 'all' ? 'All time' : String(scope);
  const isPastYear = scope !== 'all' && scope < thisYear;
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;

  return (
    <main className="trends">
      <h1 className="tr-title">Trends</h1>
      <TrendsNav active="trends" />

      {!data.hasEntries ? (
        <div className="tr-empty">
          <h2 className="tr-empty-title">No trends yet</h2>
          <p className="tr-empty-body">
            Once you've logged a few days, this is where patterns show up — which days tend to be clear, how
            your weeks line up with your intention, and how much you've tracked.
          </p>
        </div>
      ) : (
        <>
          <div className="tr-scope" role="group" aria-label="Period">
            {[...data.years, 'all' as const].map((opt) => {
              const label = opt === 'all' ? 'All time' : String(opt);
              return (
                <button
                  key={label}
                  type="button"
                  className="tr-scope-pill"
                  aria-pressed={opt === scope}
                  onClick={() => {
                    setScope(opt);
                    setExpandedWeek(null);
                    setRowSel(null);
                    setDowSel(null);
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="tr-stats">
            {data.showDayStreak && (
              <StreakCard
                unit="day"
                isPastYear={isPastYear}
                now={data.dayStreak}
                best={data.bestDayStreak}
                scopeLabel={scope === 'all' ? 'all time' : String(scope)}
              />
            )}
            <StreakCard
              unit="week"
              isPastYear={isPastYear}
              now={data.weekStreak}
              best={data.bestWeekStreak}
              scopeLabel={scope === 'all' ? 'all time' : String(scope)}
            />
          </div>

          <section className="card tr-glance" aria-label={`At a glance, ${scopeLabel}`}>
            <div className="tr-glance-row">
              <div><p className="tr-stat-value">{data.total}</p><p className="tr-stat-label">clear days</p></div>
              <div><p className="tr-stat-value">{data.trackedDays}<span className="tr-of"> / {data.availableDays}</span></p><p className="tr-stat-label">days logged</p></div>
              <div><p className="tr-stat-value">{data.weeksMet}<span className="tr-of"> / {data.weeksCounted}</span></p><p className="tr-stat-label">weeks met intention</p></div>
            </div>
            {data.compare && <p className="tr-compare">{comparisonText(data.total, data.compare.before, data.compare.label)}</p>}
          </section>

          <h2 className="tr-section">Estimated drinks · {scopeLabel}</h2>
          <div className="card tr-card">
            <p className="tr-big">
              {data.drinksPerWeek ? drinksText(data.drinksPerWeek, scopeLabel) : 'Not enough logged days for a weekly estimate.'}
            </p>
            <MonthlyChart
              kind="line"
              name={`Months of ${scopeLabel}: estimated drinks a week`}
              format={(v) => String(wholeDrinks(v))}
              points={data.trend.points.map((p) => ({ label: ML[p.month - 1].slice(0, 3), full: `${ML[p.month - 1]} ${p.year}`, value: p.perWeek, soFar: p.soFar }))}
              detail={(_, i) => {
                const p = data.trend.points[i];
                if (p.perWeek === null) {
                  return <p className="mc-detail-line">Not enough logged days for an estimate ({p.logged} logged; 7 needed).</p>;
                }
                const start = isoOf(p.year, p.month, 1);
                const end = new Date(Date.UTC(p.year, p.month, 0)).toISOString().slice(0, 10);
                const r = summarizeRange(data.snap, start, end);
                return (
                  <>
                    <p className="mc-detail-line">{drinksText({ perWeek: p.perWeek, orMore: p.orMore }, `${ML[p.month - 1]}${p.soFar ? ' so far' : ''}`)}</p>
                    {(() => {
                      const c = monthVsPrevious(p);
                      return c && <p className="mc-detail-line">{drinksChangeText(c.lead, c.diff, c.vs)}</p>;
                    })()}
                    <p className="mc-detail-line">
                      {r.levels.clear} clear · {r.levels['a-few']} a few · {r.levels.moderate} moderate · {r.levels['a-lot']} a lot · {p.logged} days logged
                    </p>
                    <Link className="mc-detail-link" to={`/trends/review?year=${p.year}&month=${p.month}`}>{ML[p.month - 1]} {p.year} in review →</Link>
                  </>
                );
              }}
            />
            {(data.trend.three || data.trend.six) && (
              <ul className="tr-trends">
                {data.trend.three && <li>{drinksChangeText('Last 3 months', data.trend.three.diff, 'the 3 before')}{challengeNote(data.trend.notes.three)}</li>}
                {data.trend.six && <li>{drinksChangeText('Last 6 months', data.trend.six.diff, 'the 6 before')}{challengeNote(data.trend.notes.six)}</li>}
              </ul>
            )}
            <p className="tr-foot">
              From logged days, counting A few as 1.5 drinks, Moderate as 3.5 and A lot as 5 — its minimum, so a period with an A lot day reads “or more”. Unlogged days aren't included.{' '}
              <Link className="tr-help" to="/settings/help?topic=estimates">How is this calculated?</Link>
            </p>
          </div>

          <h2 className="tr-section">By day of week · {scopeLabel}</h2>
          <div className="card tr-card">
          <LevelLegend levels={data.levels} />
          <ul className="tr-dow">
            {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
              const stat = data.dowStats.find((d) => d.weekday === wd) ?? { clear: 0, aFew: 0, more: 0 };
              const rowTotal = stat.clear + stat.aFew + stat.more;
              const pct = rowTotal > 0 ? Math.round((stat.clear / rowTotal) * 100) : null;
              // Each row is scaled to its own total: weekdays occur about
              // equally often, so only the split is compared.
              const share = (n: number) => (rowTotal > 0 ? (n / rowTotal) * 100 : 0);
              const name = WEEKDAY_SHORT[wd];
              return (
                <li key={wd} className="tr-dow-li">
                  <button
                  type="button"
                  className="tr-dow-row"
                  aria-pressed={dowSel === wd}
                  onClick={() => setDowSel((x) => (x === wd ? null : wd))}
                  aria-label={
                    rowTotal > 0
                      ? `${name}: ${pct}% clear; ${stat.clear} clear, ${stat.aFew} a few, ${stat.more} moderate or a lot; ${plural(rowTotal, 'day')} logged`
                      : `${name}: no days logged`
                  }
                >
                  <span className="tr-dow-label" aria-hidden="true">{name}</span>
                  <span className="tr-dow-track" aria-hidden="true">
                    {stat.clear > 0 && <span className="tr-dow-seg tr-seg-clear" style={{ width: `${share(stat.clear)}%` }} />}
                    {stat.aFew > 0 && <span className="tr-dow-seg tr-seg-a-few" style={{ width: `${share(stat.aFew)}%` }} />}
                    {stat.more > 0 && <span className="tr-dow-seg tr-seg-drinking" style={{ width: `${share(stat.more)}%` }} />}
                  </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {(() => {
            if (dowSel === null) return <p className="tr-foot">Tap a day for details.</p>;
            const w = weekdaySummary(data.snap, data.rangeStart, data.rangeEnd, dowSel);
            const day = WEEKDAY_LONG[dowSel];
            return (
              <div className="tr-detail tr-dow-detail" role="region" aria-label={`${day}s details`}>
                <p className="tr-detail-week">{day}s · {scopeLabel}</p>
                {w.logged === 0 ? (
                  <p className="tr-detail-line">No {day}s logged.</p>
                ) : (
                  <>
                    <p className="tr-detail-line">
                      {w.logged} logged: {w.levels.clear} clear · {w.levels['a-few']} a few · {w.levels.moderate} moderate · {w.levels['a-lot']} a lot.{' '}
                      {Math.round((w.levels.clear / w.logged) * 100)}% clear.
                    </p>
                    <p className="tr-detail-line">{typicalDayText(w.perDay!.least, w.perDay!.most, day)}</p>
                  </>
                )}
              </div>
            );
          })()}
          </div>

          <h2 className="tr-section">{scope === 'all' ? 'Year by year' : 'Month by month'} · {scopeLabel}</h2>
          <div className="card tr-card">
            <LevelLegend levels={data.levels} />
            <ul className="tr-rows">
              {data.rows.map((r) => {
                const unlogged = Math.max(0, r.available - r.clear - r.aFew - r.more);
                return (
                  <li key={r.label}>
                    <button
                      type="button"
                      className="tr-row-btn"
                      aria-pressed={rowSel === r.label}
                      aria-label={`${r.label}: ${r.clear} clear, ${r.aFew} a few, ${r.more} moderate or a lot, ${unlogged} not logged`}
                      onClick={() => setRowSel((x) => (x === r.label ? null : r.label))}
                    >
                      <span className="tr-row-label" aria-hidden="true">{r.label}</span>
                      <span className="tr-row-bar" aria-hidden="true">
                        {r.clear > 0 && <span className="tr-dow-seg tr-seg-clear" style={{ flex: r.clear }} />}
                        {r.aFew > 0 && <span className="tr-dow-seg tr-seg-a-few" style={{ flex: r.aFew }} />}
                        {r.more > 0 && <span className="tr-dow-seg tr-seg-drinking" style={{ flex: r.more }} />}
                        {unlogged > 0 && <span className="tr-dow-seg tr-seg-none" style={{ flex: unlogged }} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {(() => {
              const r = data.rows.find((x) => x.label === rowSel);
              if (!r) return <p className="tr-foot">Tap a {scope === 'all' ? 'year' : 'month'} for details.</p>;
              const sum = summarizeRange(data.snap, r.start, r.end);
              const unlogged = Math.max(0, r.available - sum.logged);
              const name = r.month ? `${MONTH_LONG[r.month - 1]} ${r.year}` : String(r.year);
              const review = `/trends/review?year=${r.year}${r.month ? `&month=${r.month}` : ''}`;
              return (
                <div className="tr-detail" role="region" aria-label={`${name} details`}>
                  <p className="tr-detail-week">{name}</p>
                  <p className="tr-detail-line">
                    {sum.levels.clear} clear · {sum.levels['a-few']} a few · {sum.levels.moderate} moderate · {sum.levels['a-lot']} a lot · {unlogged} not logged
                  </p>
                  <p className="tr-detail-line">
                    {sum.drinksPerWeek ? drinksText(sum.drinksPerWeek, `${r.month ? MONTH_LONG[r.month - 1] : r.year}${r.end < (r.month ? isoOf(r.year, r.month, daysInMonth(r.year, r.month)) : `${r.year}-12-31`) ? ' so far' : ''}`) : 'Not enough logged days for a weekly estimate.'}
                  </p>
                  <div className="tr-detail-links">
                    <Link className="tr-view-week" to={review}>{name} in review →</Link>
                    {r.month && <Link className="tr-view-week" to={`/?year=${r.year}&month=${r.month}`}>View on Check-in →</Link>}
                  </div>
                </div>
              );
            })()}
            <p className="tr-foot">Grey = days not logged.</p>
          </div>

          <h2 className="tr-section">
            Intention · {alignmentYear}
            {scope === 'all' ? ' (most recent year)' : ''}
          </h2>
          <div className="tr-legend">
            {(['exceeded', 'met', 'partial', 'unclear', 'unlogged', ...(data.weeks.some((w) => w.target === null) ? (['before'] as const) : [])] as const).map((a) => (
              <span key={a} className="tr-legend-item">
                <span className={`tr-swatch tr-align-${a}`} />
                {ALIGNMENT_NAMES[a]}
              </span>
            ))}
          </div>
          <p className="tr-grid-key">
            Each tile is a week, showing its clear days. "2 of 4": weeks met that month. "Not enough logged": short of the
            intention, but with days not logged that could still make it — log them to settle it.
          </p>
          {data.weeks.length === 0 ? (
            <p className="tr-empty-text">
              {data.intentionStart && data.intentionStart.slice(0, 4) > String(alignmentYear)
                ? `Your intention starts the week of ${labelFor(data.intentionStart)}, ${data.intentionStart.slice(0, 4)}, so weeks in ${alignmentYear} aren't measured.`
                : `No logged weeks yet for ${alignmentYear}.`}
            </p>
          ) : (
            <div className="card tr-card">
              {(() => {
                // The panel always shows a week: the chosen one, or the latest.
                const w = data.weeks.find((x) => x.weekStartIso === expandedWeek) ?? data.weeks[data.weeks.length - 1];
                const at = data.weeks.indexOf(w);
                const a = alignmentOf(w);
                return (
                  <>
                    <IntentionChart weeks={data.weeks} selected={w.weekStartIso} onSelect={setExpandedWeek} year={alignmentYear} />
                    <div className="tr-detail" aria-live="polite">
                      <div className="tr-detail-nav">
                        <button type="button" className="tr-step" aria-label="Previous week" disabled={at === 0} onClick={() => setExpandedWeek(data.weeks[at - 1].weekStartIso)}>‹</button>
                        <p className="tr-detail-week">Week of {labelFor(w.weekStartIso)} · {ALIGNMENT_NAMES[a].toLowerCase()}</p>
                        <button type="button" className="tr-step" aria-label="Next week" disabled={at === data.weeks.length - 1} onClick={() => setExpandedWeek(data.weeks[at + 1].weekStartIso)}>›</button>
                      </div>
                      <div className="tr-detail-stats">
                        <span>{w.target === null ? 'No intention yet' : `Intention: ${w.target} clear days`}</span>
                        <span>Actual: {w.hasEntries ? w.count : '—'}{w.hasEntries && (w.logged ?? 7) < 7 ? ` (${w.logged} of 7 days logged)` : ''}</span>
                      </div>
                      <Link className="tr-view-week" to={`/?year=${w.weekStartIso.slice(0, 4)}&month=${Number(w.weekStartIso.slice(5, 7))}`}>
                        View week →
                      </Link>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <h2 className="tr-section">Estimated savings · {scopeLabel}</h2>
          <SavingsCard scope={scope} scopeLabel={scopeLabel} trend={data.trend} />
        </>
      )}
      <HelpLinks topic="trends">About Trends and reports</HelpLinks>
    </main>
  );
}

/**
 * Current and past years show different things: a past year has no "now",
 * only its best. Streaks count toward the year they end in (see compute.ts).
 */
function StreakCard({
  unit, isPastYear, now, best, scopeLabel,
}: { unit: 'day' | 'week'; isPastYear: boolean; now: number; best: number; scopeLabel: string }) {
  const n = (v: number) => (v > 0 ? `${v} ${unit}${v === 1 ? '' : 's'}` : '—');
  const Unit = unit === 'day' ? 'Day' : 'Week';
  if (isPastYear) {
    return (
      <div className="card tr-stat">
        <p className="tr-stat-label">Best {unit} streak · {scopeLabel}</p>
        <p className="tr-stat-value">{n(best)}</p>
      </div>
    );
  }
  return (
    <div className="card tr-stat">
      <p className="tr-stat-label">{Unit} streak · now</p>
      <p className="tr-stat-value">{n(now)}</p>
      <p className="tr-stat-sub">Best {best} · {scopeLabel}</p>
    </div>
  );
}
