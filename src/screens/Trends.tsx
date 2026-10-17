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
import { daysBetween, isoOf, mondayOf, todayIso, yearOf } from '../data/dates';
import { Data as Snapshot, weeksMetCount } from '../data/compute';
import { SavingsCard } from '../components/SavingsCard';
import { TrendsNav } from '../components/SegmentNav';
import { LevelLegend } from '../components/LevelLegend';
import { buildReport, sameStretchLastYear, summarizeRange, weekdaySummary } from '../data/report';
import { alignmentName, alignmentOf, alignmentWord, IntentionChart, type MeasuredWeek } from '../components/IntentionChart';
import { comparisonText, drinksText, wholeDrinks } from '../lib/reportText';
import { momentumIncludes } from '../data/baseline';
import { chartMonths, monthlyRates, SIX_MONTHS, THREE_MONTHS, windowChange, type DrinksEstimate } from '../data/trend';
import { MonthlyChart } from '../components/MonthlyChart';
import { challengeNote, drinksChangeText, monthVsPrevious, type DrinksTrend } from '../lib/trendText';
import { chosenMonthRanges, getChallenges } from '../data/database';
import './Trends.css';
import { t, type Key } from '../i18n';
import { dayMonth, dayMonthYear, monthName, monthYear, weekdayName } from '../i18n/format';

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
// - "2026 at a glance" (rc.12): clear days with a comparison, days logged,
//   weeks met, each level's total (shown only here) and estimated drinks a
//   week. Then Month by month: the drinks chart, each month's details (levels,
//   days logged, the change from the month before, links to its review and
//   Check-in); the last 12 months under All time.
// - Weeks by intention: weekly bars against the target (IntentionChart).

type Scope = number | 'all';

const labelFor = dayMonth;

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
        if (r.complete && r.previous) compare = { before: r.previous.clear, label: t('report.vsYear', { year: scope - 1 }) };
        if (!r.complete) {
          const last = sameStretchLastYear(r.start, r.end);
          const prev = summarizeRange(d, last.start, last.end);
          // As in the report: only if tracking had begun by the start of that stretch.
          if (prev.logged > 0 && first !== null && first <= last.start) compare = { before: prev.levels.clear, label: t('trends.sameTimeLastYear') };
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
              return { label: monthName(m.month, 'short'), clear: m.clear, aFew: m.aFew, more: m.more, available, start: isoOf(scope, m.month, 1), end, year: scope, month: m.month };
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

  const scopeLabel = scope === 'all' ? t('trends.allTime') : String(scope);
  const isPastYear = scope !== 'all' && scope < thisYear;

  return (
    <main className="trends">
      <h1 className="tr-title">{t('trends.title')}</h1>
      <TrendsNav active="trends" />

      {!data.hasEntries ? (
        <div className="tr-empty">
          <h2 className="tr-empty-title">{t('trends.emptyTitle')}</h2>
          <p className="tr-empty-body">{t('trends.emptyBody')}</p>
        </div>
      ) : (
        <>
          <div className="tr-scope" role="group" aria-label={t('trends.period')}>
            {[...data.years, 'all' as const].map((opt) => {
              const label = opt === 'all' ? t('trends.allTime') : String(opt);
              return (
                <button
                  key={label}
                  type="button"
                  className="tr-scope-pill"
                  aria-pressed={opt === scope}
                  onClick={() => {
                    setScope(opt);
                    setExpandedWeek(null);
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
                scopeLabel={scope === 'all' ? t('trends.allTimeLower') : String(scope)}
              />
            )}
            <StreakCard
              unit="week"
              isPastYear={isPastYear}
              now={data.weekStreak}
              best={data.bestWeekStreak}
              scopeLabel={scope === 'all' ? t('trends.allTimeLower') : String(scope)}
            />
          </div>

          <h2 className="tr-section">{t('trends.atAGlance', { scope: scopeLabel })}</h2>
          <section className="card tr-glance" aria-label={t('trends.atAGlance', { scope: scopeLabel })}>
            {/* Clear days and weeks met lead; days logged is context (rc.13). */}
            <div className="tr-hero-row">
              <div><p className="tr-hero-value">{data.total}</p><p className="tr-stat-label">{t('trends.clearDays')}</p></div>
              <div><p className="tr-hero-value">{data.weeksMet}<span className="tr-of">{t('trends.ofTotal', { total: data.weeksCounted })}</span></p><p className="tr-stat-label">{t('trends.weeksMet')}</p></div>
            </div>
            {data.compare && <p className="tr-compare">{comparisonText(data.total, data.compare.before, data.compare.label)}</p>}
            <p className="tr-glance-logged">{t('trends.daysLogged', { logged: data.trackedDays, available: data.availableDays })}</p>
            <div className="tr-glance-levels"><LevelLegend levels={data.levels} /></div>
          </section>

          <h2 className="tr-section">{t('trends.monthByMonth', { scope: scope === 'all' ? t('trends.last12') : scopeLabel })}</h2>
          <div className="card tr-card">
            <MonthlyChart
              kind="bars"
              name={t('trends.clearChartName', { scope: scopeLabel })}
              format={(v) => String(Math.round(v))}
              points={data.trend.points.map((p) => {
                const r = summarizeRange(data.snap, isoOf(p.year, p.month, 1), new Date(Date.UTC(p.year, p.month, 0)).toISOString().slice(0, 10));
                return { label: monthName(p.month, 'short'), full: monthYear(p.month, p.year), value: r.logged ? r.levels.clear : null, soFar: p.soFar };
              })}
              detail={(_, i) => {
                const p = data.trend.points[i];
                const start = isoOf(p.year, p.month, 1);
                const end = new Date(Date.UTC(p.year, p.month, 0)).toISOString().slice(0, 10);
                const r = summarizeRange(data.snap, start, end);
                if (!r.logged) return <p className="mc-detail-line">{t('trends.noDaysLogged')}</p>;
                return (
                  <>
                    <p className="mc-detail-line mc-detail-strong">{t('trends.monthClear', { count: r.levels.clear, logged: t('trends.loggedCount', { count: r.logged }) })}</p>
                    <p className="mc-detail-line">{t('trends.levelsLine', { aFew: r.levels['a-few'], moderate: r.levels.moderate, aLot: r.levels['a-lot'] })}</p>
                    {p.perWeek !== null && <p className="mc-detail-line mc-detail-quiet">{t('trends.estimated', { count: wholeDrinks(p.perWeek) })}</p>}
                    <div className="mc-detail-links">
                      <Link className="mc-detail-link" to={`/trends/review?year=${p.year}&month=${p.month}`}>{t('trends.inReview', { month: monthYear(p.month, p.year) })}</Link>
                      <Link className="mc-detail-link" to={`/?year=${p.year}&month=${p.month}`}>{t('trends.viewOnCheckin')}</Link>
                    </div>
                  </>
                );
              }}
            />
          </div>

          <h2 className="tr-section">
            {t('trends.weeksHead', { year: alignmentYear })}
            {scope === 'all' ? t('trends.mostRecentYear') : ''}
          </h2>
          <div className="tr-legend">
            {(['exceeded', 'met', 'partial', 'unclear', 'unlogged', ...(data.weeks.some((w) => w.target === null) ? (['before'] as const) : [])] as const).map((a) => (
              <span key={a} className="tr-legend-item">
                <span className={`tr-swatch tr-align-${a}`} />
                {alignmentName(a)}
              </span>
            ))}
          </div>
          <p className="tr-grid-key">{t('trends.gridKey')}</p>
          {data.weeks.length === 0 ? (
            <p className="tr-empty-text">
              {data.intentionStart && data.intentionStart.slice(0, 4) > String(alignmentYear)
                ? t('trends.intentionLater', { date: dayMonthYear(data.intentionStart), year: alignmentYear })
                : t('trends.noWeeks', { year: alignmentYear })}
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
                        <button type="button" className="tr-step" aria-label={t('trends.previousWeek')} disabled={at === 0} onClick={() => setExpandedWeek(data.weeks[at - 1].weekStartIso)}>‹</button>
                        <p className="tr-detail-week">{t('trends.weekOf', { date: labelFor(w.weekStartIso), alignment: alignmentWord(a) })}</p>
                        <button type="button" className="tr-step" aria-label={t('trends.nextWeek')} disabled={at === data.weeks.length - 1} onClick={() => setExpandedWeek(data.weeks[at + 1].weekStartIso)}>›</button>
                      </div>
                      <div className="tr-detail-stats">
                        <span>{w.target === null ? t('trends.noIntentionYet') : t('trends.intention', { n: w.target })}</span>
                        <span>{t('trends.actual', { count: w.hasEntries ? w.count : '—', partial: w.hasEntries && (w.logged ?? 7) < 7 ? t('trends.actualPartial', { logged: w.logged ?? 0 }) : '' })}</span>
                      </div>
                      <Link className="tr-view-week" to={`/?year=${w.weekStartIso.slice(0, 4)}&month=${Number(w.weekStartIso.slice(5, 7))}`}>
                        {t('trends.viewWeek')}
                      </Link>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <h2 className="tr-section">{t('trends.byWeekday', { scope: scopeLabel })}</h2>
          <div className="card tr-card">
          <LevelLegend />
          <ul className="tr-dow">
            {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
              const stat = data.dowStats.find((d) => d.weekday === wd) ?? { clear: 0, aFew: 0, more: 0, aLot: 0 };
              const rowTotal = stat.clear + stat.aFew + stat.more;
              const pct = rowTotal > 0 ? Math.round((stat.clear / rowTotal) * 100) : null;
              // Each row is scaled to its own total: weekdays occur about
              // equally often, so only the split is compared.
              const share = (n: number) => (rowTotal > 0 ? (n / rowTotal) * 100 : 0);
              const name = weekdayName(wd, 'short');
              return (
                <li key={wd} className="tr-dow-li">
                  <button
                  type="button"
                  className="tr-dow-row"
                  aria-pressed={dowSel === wd}
                  onClick={() => setDowSel((x) => (x === wd ? null : wd))}
                  aria-label={
                    rowTotal > 0
                      ? t('trends.dowLabel', { day: name, pct: pct ?? 0, clear: stat.clear, aFew: stat.aFew, moderate: stat.more - stat.aLot, aLot: stat.aLot, count: rowTotal })
                      : t('trends.dowEmpty', { day: name })
                  }
                >
                  <span className="tr-dow-label" aria-hidden="true">{name}</span>
                  <span className="tr-dow-track" aria-hidden="true">
                    {stat.clear > 0 && <span className="tr-dow-seg tr-seg-clear" style={{ width: `${share(stat.clear)}%` }} />}
                    {stat.aFew > 0 && <span className="tr-dow-seg tr-seg-a-few" style={{ width: `${share(stat.aFew)}%` }} />}
                    {stat.more - stat.aLot > 0 && <span className="tr-dow-seg tr-seg-drinking" style={{ width: `${share(stat.more - stat.aLot)}%` }} />}
                    {stat.aLot > 0 && <span className="tr-dow-seg tr-seg-a-lot" style={{ width: `${share(stat.aLot)}%` }} />}
                  </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {(() => {
            if (dowSel === null) return <p className="tr-foot">{t('trends.tapDay')}</p>;
            const w = weekdaySummary(data.snap, data.rangeStart, data.rangeEnd, dowSel);
            const days = t(`trends.weekdayPlural.${dowSel}` as Key);
            return (
              <div className="tr-detail tr-dow-detail" role="region" aria-label={t('trends.dowDetails', { days })}>
                <p className="tr-detail-week">{t('trends.dowHead', { days, scope: scopeLabel })}</p>
                {w.logged === 0 ? (
                  <p className="tr-detail-line">{t('trends.dowNone', { days })}</p>
                ) : (
                  <>
                    <p className="tr-detail-line">
                      {t('trends.dowLine', { logged: w.logged, clear: w.levels.clear, aFew: w.levels['a-few'], moderate: w.levels.moderate, aLot: w.levels['a-lot'], pct: Math.round((w.levels.clear / w.logged) * 100) })}
                    </p>
                  </>
                )}
              </div>
            );
          })()}
          </div>

          <h2 className="tr-section tr-est-head">{t('trends.estimates', { scope: scopeLabel })}</h2>
          <p className="tr-est-intro">{t('trends.estIntro')}</p>
          <h3 className="tr-sub">{t('trends.drinksAWeek')}</h3>
          <div className="card tr-card">
            <p className="tr-est-figure">{data.drinksPerWeek ? drinksText(data.drinksPerWeek) : t('trends.noWeekly')}</p>
            <MonthlyChart
              kind="line"
              name={t('trends.drinksChartName', { scope: scopeLabel })}
              format={(v) => String(wholeDrinks(v))}
              points={data.trend.points.map((p) => ({ label: monthName(p.month, 'short'), full: monthYear(p.month, p.year), value: p.perWeek, soFar: p.soFar }))}
              detail={(_, i) => {
                const p = data.trend.points[i];
                if (p.perWeek === null) {
                  return <p className="mc-detail-line">{t('savings.notEnough', { logged: p.logged })}</p>;
                }
                const start = isoOf(p.year, p.month, 1);
                const end = new Date(Date.UTC(p.year, p.month, 0)).toISOString().slice(0, 10);
                const r = summarizeRange(data.snap, start, end);
                return (
                  <>
                    <p className="mc-detail-line">{drinksText({ perWeek: p.perWeek })}</p>
                    {(() => {
                      const c = monthVsPrevious(p);
                      return c && <p className="mc-detail-line">{drinksChangeText(null, c.diff, c.vs)}</p>;
                    })()}
                    <p className="mc-detail-line">
                      {t('trends.monthLevels', { clear: r.levels.clear, aFew: r.levels['a-few'], moderate: r.levels.moderate, aLot: r.levels['a-lot'], logged: t('trends.loggedCount', { count: p.logged }) })}
                    </p>
                    <div className="mc-detail-links">
                      <Link className="mc-detail-link" to={`/trends/review?year=${p.year}&month=${p.month}`}>{t('trends.inReview', { month: monthYear(p.month, p.year) })}</Link>
                      <Link className="mc-detail-link" to={`/?year=${p.year}&month=${p.month}`}>{t('trends.viewOnCheckin')}</Link>
                    </div>
                  </>
                );
              }}
            />
            {(data.trend.three || data.trend.six) && (
              <ul className="tr-trends">
                {data.trend.three && <li>{drinksChangeText(t('savings.last3'), data.trend.three.diff, t('savings.the3Before'))}{challengeNote(data.trend.notes.three)}</li>}
                {data.trend.six && <li>{drinksChangeText(t('savings.last6'), data.trend.six.diff, t('savings.the6Before'))}{challengeNote(data.trend.notes.six)}</li>}
              </ul>
            )}
            <p className="tr-foot">
              {t('trends.estFoot')}{' '}
              <Link className="tr-help" to="/settings/help?topic=estimates">{t('savings.howCalculated')}</Link>
            </p>
          </div>

          <h3 className="tr-sub">{t('trends.savings')}</h3>
          <SavingsCard scope={scope} scopeLabel={scopeLabel} trend={data.trend} />
        </>
      )}
      <HelpLinks topic="trends">{t('trends.help')}</HelpLinks>
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
  const n = (v: number) => (v > 0 ? t(unit === 'day' ? 'trends.days' : 'trends.weeks', { count: v }) : '—');
  if (isPastYear) {
    return (
      <div className="card tr-stat">
        <p className="tr-stat-label">{t(`trends.bestStreak.${unit}`, { scope: scopeLabel })}</p>
        <p className="tr-stat-value">{n(best)}</p>
      </div>
    );
  }
  return (
    <div className="card tr-stat">
      <p className="tr-stat-label">{t(`trends.streakNow.${unit}`)}</p>
      <p className="tr-stat-value">{n(now)}</p>
      <p className="tr-stat-sub">{t('trends.streakBest', { n: best, scope: scopeLabel })}</p>
    </div>
  );
}
