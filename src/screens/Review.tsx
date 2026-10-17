import { useEffect, useMemo, useState } from 'react';
import { useDevice } from '../components/DeviceFields';
import { platform } from '../lib/install';
import { HelpLinks } from '../components/HelpLink';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DayCell } from '../components/DayCell';
import { LevelLegend } from '../components/LevelLegend';
import { TrendsNav } from '../components/SegmentNav';
import { Data } from '../data/compute';
import { getBackupData, getChallenges, getSavingsSettings, getSetting, setSetting } from '../data/database';
import { addDays, daysInMonth, isoOf, todayIso, weekdayOf } from '../data/dates';
import { buildReport, defaultPeriod, periodBounds, previousPeriod, type Period, type Report } from '../data/report';
import { comparisonText, drinksText } from '../lib/reportText';
import { drinksChangeText } from '../lib/trendText';
import { describeSavings } from '../lib/savings';
import './Review.css';
import { t, type Key } from '../i18n';
import { dayMonth, dayMonthYear, monthName, monthYear, weekdayLetter, weekdayName } from '../i18n/format';

// Month in review / Year in review. For the user first; print-ready, so it
// can be saved as a PDF or shared (on iPhone: Share → Print → Save to Files,
// or straight to Mail/Messages). Sections can be left out before sharing.

const fmt = dayMonth;

const SECTIONS = [
  ['days', 'review.sec.days'],
  ['intention', 'review.sec.intention'],
  ['patterns', 'review.sec.patterns'],
  ['drinks', 'review.sec.drinks'],
  ['savings', 'review.sec.savings'],
  ['milestones', 'review.sec.milestones'],
  ['challenges', 'review.sec.challenges'],
] as const satisfies readonly (readonly [string, Key])[];
type Section = (typeof SECTIONS)[number][0];
// For you more than for a reader: left out until ticked (rc.7).
const OFF_BY_DEFAULT: Section[] = ['savings', 'milestones', 'challenges'];

export const periodLabel = (p: Period) => (p.month ? monthYear(p.month, p.year) : String(p.year));

export function Review() {
  const P = platform(useDevice());
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const today = todayIso();
  const period: Period = params.get('year')
    ? { year: Number(params.get('year')), month: params.get('month') ? Number(params.get('month')) : null }
    : defaultPeriod(today);
  const [report, setReport] = useState<Report | null>(null);
  const [hidden, setHidden] = useState<Set<Section>>(new Set());
  const [savingsSet, setSavingsSet] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [all, sv, h, ch] = await Promise.all([getBackupData(), getSavingsSettings(), getSetting('report_hidden_sections', ''), getChallenges()]);
      if (cancelled) return;
      const savings = sv.effective;
      setSavingsSet(!!savings);
      // '' = never chosen (use the defaults); 'none' = everything included.
      setHidden(new Set(h === '' ? OFF_BY_DEFAULT : h === 'none' ? [] : (h.split(',') as Section[])));
      setReport(buildReport(new Data({ entries: all.dayEntries, intentions: all.intentions }), period, today, savings, ch));
      // Opening a month's review counts as seeing it (for the Check-in note).
      if (period.month) setSetting(`report_seen_${period.year}-${String(period.month).padStart(2, '0')}`, 'true');
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.year, period.month, today]);

  const go = (p: Period) => navigate(`/trends/review?year=${p.year}${p.month ? `&month=${p.month}` : ''}`, { replace: true });
  const next: Period = period.month
    ? period.month === 12 ? { year: period.year + 1, month: 1 } : { year: period.year, month: period.month + 1 }
    : { year: period.year + 1, month: null };
  const canNext = periodBounds(next).start <= today;

  const toggle = (s: Section) => {
    const h = new Set(hidden);
    if (h.has(s)) h.delete(s);
    else h.add(s);
    setHidden(h);
    setSetting('report_hidden_sections', h.size ? [...h].join(',') : 'none');
  };
  const show = (s: Section) => !hidden.has(s);

  const cal = useMemo(() => {
    if (!report || !period.month) return [];
    const first = isoOf(period.year, period.month, 1);
    const pad = (weekdayOf(first) + 6) % 7;
    const cells: (string | null)[] = Array(pad).fill(null);
    for (let i = 0; i < daysInMonth(period.year, period.month); i++) cells.push(addDays(first, i));
    return cells;
  }, [report, period.year, period.month]);

  if (!report) return <main className="review" />;
  const r = report;
  const prev = previousPeriod(period);
  // "August" within the same year, "December 2025" or "2025" across years.
  const prevLabel = prev.month && prev.year === period.year ? monthName(prev.month) : periodLabel(prev);
  const label = periodLabel(period);

  return (
    <main className="review">
      <h1 className="rv-page-title rv-noprint">{t('review.title')}</h1>
      <TrendsNav active="reports" />
      <div className="rv-header rv-noprint">
        <div className="rv-kind" role="radiogroup" aria-label={t('review.periodLabel')}>
          <button type="button" role="radio" aria-checked={!!period.month} className="rv-kind-pill"
            onClick={() => go(period.month ? period : { year: period.year, month: period.year === Number(today.slice(0, 4)) ? Number(today.slice(5, 7)) : 12 })}>
            {t('review.month')}
          </button>
          <button type="button" role="radio" aria-checked={!period.month} className="rv-kind-pill" onClick={() => go({ year: period.year, month: null })}>
            {t('review.year')}
          </button>
        </div>
      </div>

      <div className="rv-title-row">
        <button type="button" className="rv-arrow rv-noprint" onClick={() => go(previousPeriod(period))} aria-label={t('review.previous')}>‹</button>
        <h2 className="rv-title">{t('review.inReview', { period: label })}</h2>
        <button type="button" className="rv-arrow rv-noprint" onClick={() => go(next)} disabled={!canNext} aria-label={t('review.next')}>›</button>
      </div>
      <p className="rv-sub">
        {t('review.range', {
          start: fmt(r.start), end: fmt(r.end),
          year: r.end.slice(0, 4) !== r.start.slice(0, 4) ? '' : t('review.yearSuffix', { year: period.year }),
          soFar: r.complete ? '' : t('chart.soFar'), logged: r.logged, days: t('review.days', { count: r.daysInPeriod }),
        })}
      </p>

      {r.logged === 0 ? (
        <div className="card rv-card"><p className="rv-muted">{t('review.noneLogged', { period: label })}</p></div>
      ) : (
        <>
          <section className="card rv-card">
            <div className="rv-stats">
              <div><p className="rv-stat-value">{r.levels.clear}</p><p className="rv-stat-label">{t('review.clearDays')}</p></div>
              <div><p className="rv-stat-value">{r.logged}<span className="rv-of"> / {r.daysInPeriod}</span></p><p className="rv-stat-label">{t('review.daysLogged')}</p></div>
              {/* Follows the sections chosen: no intention figures if Intention is left out. */}
              {show('intention') && (
                <div><p className="rv-stat-value">{r.weeks.met}<span className="rv-of"> / {r.weeks.counted}</span></p><p className="rv-stat-label">{t('review.weeksMet')}</p></div>
              )}
            </div>
            {r.previous && <p className="rv-muted rv-compare">{comparisonText(r.levels.clear, r.previous.clear, prevLabel)}</p>}
            {/* The period at a glance: clear days and intention first, the level totals once (rc.13: drinks moved to its own closing section). */}
            <div className="rv-glance-levels"><LevelLegend levels={r.levels} /></div>
          </section>

          {show('days') && (
            <section className="rv-section">
              <h2 className="rv-sec">{t('review.sec.days')}</h2>
              <div className="card rv-card">
                <LevelLegend />
                {period.month ? (
                  <div className="rv-cal" aria-label={t('review.calendarFor', { period: label })}>
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => <span key={d} className="rv-wd" aria-hidden="true">{weekdayLetter(d)}</span>)}
                    {cal.map((iso, i) => iso
                      ? <DayCell key={iso} day={Number(iso.slice(8, 10))} level={r.calendar[iso] ?? null} future={iso > today} />
                      : <div key={`p${i}`} />)}
                  </div>
                ) : (
                  <ul className="rv-months">
                    {r.months.map((m) => (
                      <li key={m.month} aria-label={t('review.levelsLabel', { name: monthName(m.month), clear: m.clear, few: m.aFew, moderate: m.more - m.aLot, lot: m.aLot })}>
                        <span className="rv-m-name" aria-hidden="true">{monthName(m.month, 'short')}</span>
                        <span className="rv-m-bar" aria-hidden="true">
                          {m.clear > 0 && <span className="rv-seg rv-seg-clear" style={{ flex: m.clear }} />}
                          {m.aFew > 0 && <span className="rv-seg rv-seg-few" style={{ flex: m.aFew }} />}
                          {m.more - m.aLot > 0 && <span className="rv-seg rv-seg-more" style={{ flex: m.more - m.aLot }} />}
                          {m.aLot > 0 && <span className="rv-seg rv-seg-lot" style={{ flex: m.aLot }} />}
                          {m.available > m.logged && <span className="rv-seg rv-seg-none" style={{ flex: m.available - m.logged }} />}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          {show('intention') && (
            <section className="rv-section">
              <h2 className="rv-sec">{t('review.sec.intention')}</h2>
              <div className="card rv-card rv-text">
                <p>
                  {r.targets.length === 0
                    ? r.weeks.before > 0
                      ? t('review.weeksBefore')
                      : t('review.weeksNone')
                    : r.targets.map((x, i) => (i ? t('review.then', { n: x.target, date: fmt(x.from) }) : t('review.aiming', { n: x.target }))).join('')}
                  .{r.targets.length > 0 && r.weeks.before > 0 ? t('review.beforeNotCounted') : ''}
                </p>
                {r.weeks.counted > 0 && (
                  <p>
                    {t('review.metIn', { met: r.weeks.met, weeks: t('review.weeks', { count: r.weeks.counted }) })}
                    {r.weeks.exceeded ? t('review.beyondIn', { n: r.weeks.exceeded }) : ''}
                    {r.weeks.unclear ? t('review.unclear', { n: r.weeks.unclear }) : ''}.
                    {r.backOnTrack
                      ? t('review.back', { times: r.backOnTrack === 1 ? t('review.once') : r.backOnTrack === 2 ? t('review.twice') : t('review.times', { n: r.backOnTrack }) })
                      : ''}
                  </p>
                )}
              </div>
            </section>
          )}

          {show('patterns') && (
            <section className="rv-section">
              <h2 className="rv-sec">{t('review.sec.patterns')}</h2>
              <div className="card rv-card">
                <LevelLegend />
                <ul className="rv-dow">
                  {r.dayOfWeek.map((w) => {
                    const n = w.clear + w.aFew + w.more;
                    return (
                      <li key={w.weekday} aria-label={t('review.levelsLabel', { name: weekdayName(w.weekday, 'short'), clear: w.clear, few: w.aFew, moderate: w.more - w.aLot, lot: w.aLot }) + (n ? t('review.pctClear', { pct: Math.round((w.clear / n) * 100) }) : '')}>
                        <span className="rv-m-name" aria-hidden="true">{weekdayName(w.weekday, 'short')}</span>
                        <span className="rv-m-bar" aria-hidden="true">
                          {w.clear > 0 && <span className="rv-seg rv-seg-clear" style={{ flex: w.clear }} />}
                          {w.aFew > 0 && <span className="rv-seg rv-seg-few" style={{ flex: w.aFew }} />}
                          {w.more - w.aLot > 0 && <span className="rv-seg rv-seg-more" style={{ flex: w.more - w.aLot }} />}
                          {w.aLot > 0 && <span className="rv-seg rv-seg-lot" style={{ flex: w.aLot }} />}
                          {n === 0 && <span className="rv-seg rv-seg-none" style={{ flex: 1 }} />}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          )}

          {show('drinks') && (
            <section className="rv-section">
              <h2 className="rv-sec">{t('review.sec.drinks')}</h2>
              <div className="card rv-card rv-text">
                <p className="rv-big">{r.drinksPerWeek ? drinksText(r.drinksPerWeek) : t('review.notEnough')}</p>
                {r.drinksChange && <p className="rv-muted">{drinksChangeText(null, r.drinksChange.diff, prevLabel)}</p>}
                <p className="rv-foot">{t('review.drinksFoot')}</p>
              </div>
            </section>
          )}

          {show('savings') && savingsSet && r.savings && (
            <section className="rv-section">
              <h2 className="rv-sec">{t('review.sec.savings')}</h2>
              <div className="card rv-card rv-text">
                <p className="rv-big">{describeSavings(r.savings.most, r.savings.least)}</p>
                <p className="rv-foot">{t('review.savingsFoot')}</p>
              </div>
            </section>
          )}

          {show('challenges') && r.challenges.length > 0 && (
            <section className="rv-section">
              <h2 className="rv-sec">{t('review.sec.challenges')}</h2>
              <div className="card rv-card">
                <ul className="rv-ms">
                  {r.challenges.map((c) => (
                    <li key={c.title + (c.date ?? '')}><span>{c.title}</span><span className="rv-muted">{c.date ? fmt(c.date) : c.note}</span></li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {show('milestones') && (
            <section className="rv-section">
              <h2 className="rv-sec">{t('review.sec.milestones')}</h2>
              <div className="card rv-card">
                {r.milestones.length === 0 ? (
                  <p className="rv-muted">{t('review.noMilestones', { period: label })}</p>
                ) : (
                  <ul className="rv-ms">
                    {r.milestones.map((m) => <li key={m.title + m.date}><span>{m.title}</span><span className="rv-muted">{fmt(m.date)}</span></li>)}
                  </ul>
                )}
              </div>
            </section>
          )}
        </>
      )}

      <p className="rv-generated">
        {t('review.generated', { date: dayMonthYear(today) })}
      </p>

      <div className="rv-noprint rv-share">
        <button type="button" className="btn btn-primary rv-share-btn" onClick={() => window.print()}>{t('review.share')}</button>
        {P !== 'other' && (
          <p className="rv-foot">
            {P === 'ios' ? t('review.shareIos') : t('review.shareAndroid')}
          </p>
        )}
        <details className="rv-include">
          <summary>{t('review.include')}</summary>
          <div className="rv-checks">
            {SECTIONS.filter(([k]) => (k !== 'savings' || savingsSet) && (k !== 'challenges' || !!report?.challenges.length)).map(([k, l]) => (
              <label key={k}><input type="checkbox" checked={show(k)} onChange={() => toggle(k)} /> {t(l)}</label>
            ))}
          </div>
        </details>
        <HelpLinks topic="trends">{t('review.about')}</HelpLinks>
      </div>
    </main>
  );
}
