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

// Month in review / Year in review. For the user first; print-ready, so it
// can be saved as a PDF or shared (on iPhone: Share → Print → Save to Files,
// or straight to Mail/Messages). Sections can be left out before sharing.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = MONTHS.map((m) => m.slice(0, 3));
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmt = (iso: string) => `${SHORT[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;

const SECTIONS = [
  ['days', 'The days'],
  ['intention', 'Intention'],
  ['patterns', 'Day of week'],
  ['drinks', 'Estimated drinks'],
  ['savings', 'Estimated savings'],
  ['milestones', 'Milestones'],
  ['challenges', 'Challenges'],
] as const;
type Section = (typeof SECTIONS)[number][0];
// For you more than for a reader: left out until ticked (rc.7).
const OFF_BY_DEFAULT: Section[] = ['savings', 'milestones', 'challenges'];

export const periodLabel = (p: Period) => (p.month ? `${MONTHS[p.month - 1]} ${p.year}` : String(p.year));
const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;

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
  const prevLabel = periodLabel(previousPeriod(period)).replace(` ${period.year}`, '');
  const label = periodLabel(period);

  return (
    <main className="review">
      <h1 className="rv-page-title rv-noprint">Reports</h1>
      <TrendsNav active="reports" />
      <div className="rv-header rv-noprint">
        <div className="rv-kind" role="radiogroup" aria-label="Report period">
          <button type="button" role="radio" aria-checked={!!period.month} className="rv-kind-pill"
            onClick={() => go(period.month ? period : { year: period.year, month: period.year === Number(today.slice(0, 4)) ? Number(today.slice(5, 7)) : 12 })}>
            Month
          </button>
          <button type="button" role="radio" aria-checked={!period.month} className="rv-kind-pill" onClick={() => go({ year: period.year, month: null })}>
            Year
          </button>
        </div>
      </div>

      <div className="rv-title-row">
        <button type="button" className="rv-arrow rv-noprint" onClick={() => go(previousPeriod(period))} aria-label="Previous">‹</button>
        <h2 className="rv-title">{label} in review</h2>
        <button type="button" className="rv-arrow rv-noprint" onClick={() => go(next)} disabled={!canNext} aria-label="Next">›</button>
      </div>
      <p className="rv-sub">
        {fmt(r.start)}–{fmt(r.end)}{r.end.slice(0, 4) !== r.start.slice(0, 4) ? '' : `, ${period.year}`}
        {r.complete ? '' : ' (so far)'} · {r.logged} of {plural(r.daysInPeriod, 'day')} logged
      </p>

      {r.logged === 0 ? (
        <div className="card rv-card"><p className="rv-muted">No days were logged in {label}.</p></div>
      ) : (
        <>
          <section className="card rv-card">
            <div className="rv-stats">
              <div><p className="rv-stat-value">{r.levels.clear}</p><p className="rv-stat-label">clear days</p></div>
              <div><p className="rv-stat-value">{r.logged}<span className="rv-of"> / {r.daysInPeriod}</span></p><p className="rv-stat-label">days logged</p></div>
              {/* Follows the sections chosen: no intention figures if Intention is left out. */}
              {show('intention') && (
                <div><p className="rv-stat-value">{r.weeks.met}<span className="rv-of"> / {r.weeks.counted}</span></p><p className="rv-stat-label">weeks met intention</p></div>
              )}
            </div>
            {r.previous && <p className="rv-muted rv-compare">{comparisonText(r.levels.clear, r.previous.clear, prevLabel)}</p>}
          </section>

          {show('days') && (
            <section className="rv-section">
              <h2 className="rv-sec">The days</h2>
              <div className="card rv-card">
                <LevelLegend levels={r.levels} />
                {period.month ? (
                  <div className="rv-cal" aria-label={`Calendar for ${label}`}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="rv-wd" aria-hidden="true">{d}</span>)}
                    {cal.map((iso, i) => iso
                      ? <DayCell key={iso} day={Number(iso.slice(8, 10))} level={r.calendar[iso] ?? null} future={iso > today} />
                      : <div key={`p${i}`} />)}
                  </div>
                ) : (
                  <ul className="rv-months">
                    {r.months.map((m) => (
                      <li key={m.month} aria-label={`${MONTHS[m.month - 1]}: ${m.clear} clear, ${m.aFew} a few, ${m.more} moderate or a lot`}>
                        <span className="rv-m-name" aria-hidden="true">{SHORT[m.month - 1]}</span>
                        <span className="rv-m-bar" aria-hidden="true">
                          {m.clear > 0 && <span className="rv-seg rv-seg-clear" style={{ flex: m.clear }} />}
                          {m.aFew > 0 && <span className="rv-seg rv-seg-few" style={{ flex: m.aFew }} />}
                          {m.more > 0 && <span className="rv-seg rv-seg-more" style={{ flex: m.more }} />}
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
              <h2 className="rv-sec">Intention</h2>
              <div className="card rv-card rv-text">
                <p>
                  {r.targets.length === 0
                    ? r.weeks.before > 0
                      ? 'These weeks came before your first intention, so they aren’t measured'
                      : 'No completed weeks in this period yet'
                    : r.targets.map((t, i) => `${i ? `, then ${t.target} from ${fmt(t.from)}` : `Aiming for ${t.target} clear days a week`}`).join('')}
                  .{r.targets.length > 0 && r.weeks.before > 0 ? ` Weeks before your first intention aren’t counted.` : ''}
                </p>
                {r.weeks.counted > 0 && (
                  <p>
                    Met in {r.weeks.met} of {plural(r.weeks.counted, 'week')}
                    {r.weeks.exceeded ? `, beyond it in ${r.weeks.exceeded}` : ''}
                    {r.weeks.unclear ? `; ${r.weeks.unclear} with too few days logged to say` : ''}.
                    {r.backOnTrack ? ` Back on track after a missed week ${r.backOnTrack === 1 ? 'once' : r.backOnTrack === 2 ? 'twice' : `${r.backOnTrack} times`}.` : ''}
                  </p>
                )}
              </div>
            </section>
          )}

          {show('patterns') && (
            <section className="rv-section">
              <h2 className="rv-sec">Day of week</h2>
              <div className="card rv-card">
                <LevelLegend levels={r.levels} />
                <ul className="rv-dow">
                  {r.dayOfWeek.map((w) => {
                    const n = w.clear + w.aFew + w.more;
                    return (
                      <li key={w.weekday} aria-label={`${WEEKDAYS[w.weekday]}: ${w.clear} clear, ${w.aFew} a few, ${w.more} moderate or a lot${n ? `, ${Math.round((w.clear / n) * 100)}% clear` : ''}`}>
                        <span className="rv-m-name" aria-hidden="true">{WEEKDAYS[w.weekday]}</span>
                        <span className="rv-m-bar" aria-hidden="true">
                          {w.clear > 0 && <span className="rv-seg rv-seg-clear" style={{ flex: w.clear }} />}
                          {w.aFew > 0 && <span className="rv-seg rv-seg-few" style={{ flex: w.aFew }} />}
                          {w.more > 0 && <span className="rv-seg rv-seg-more" style={{ flex: w.more }} />}
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
              <h2 className="rv-sec">Estimated drinks</h2>
              <div className="card rv-card rv-text">
                <p className="rv-big">{r.drinksPerWeek ? drinksText(r.drinksPerWeek) : 'Not enough logged days for a weekly estimate.'}</p>
                {r.drinksChange && <p>{drinksChangeText(null, r.drinksChange.diff, prevLabel)}</p>}
                <p className="rv-foot">
                  From logged days, counting A few as 1.5 drinks, Moderate as 3.5 and A lot as 5 — its minimum, so a period with an A lot day could be higher. Unlogged days aren't included.
                </p>
              </div>
            </section>
          )}

          {show('savings') && savingsSet && r.savings && (
            <section className="rv-section">
              <h2 className="rv-sec">Estimated savings</h2>
              <div className="card rv-card rv-text">
                <p className="rv-big">{describeSavings(r.savings.most, r.savings.least)}</p>
                <p className="rv-foot">Against the baseline set in Settings, over logged days.</p>
              </div>
            </section>
          )}

          {show('challenges') && r.challenges.length > 0 && (
            <section className="rv-section">
              <h2 className="rv-sec">Challenges</h2>
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
              <h2 className="rv-sec">Milestones</h2>
              <div className="card rv-card">
                {r.milestones.length === 0 ? (
                  <p className="rv-muted">No new milestones in {label}.</p>
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
        Made with Clear Tracker on {fmt(today)}, {today.slice(0, 4)}, from days the person logged themselves
        (self-reported). Amounts are estimates from ranges.
      </p>

      <div className="rv-noprint rv-share">
        <button type="button" className="btn btn-primary rv-share-btn" onClick={() => window.print()}>Share or save as PDF</button>
        {P !== 'other' && (
          <p className="rv-foot">
            {P === 'ios' ? 'On iPhone: tap Share in the print preview to save to Files or send it.' : 'On Android: choose Save as PDF as the printer, then tap the download button.'}
          </p>
        )}
        <details className="rv-include">
          <summary>Choose what's included</summary>
          <div className="rv-checks">
            {SECTIONS.filter(([k]) => (k !== 'savings' || savingsSet) && (k !== 'challenges' || !!report?.challenges.length)).map(([k, l]) => (
              <label key={k}><input type="checkbox" checked={show(k)} onChange={() => toggle(k)} /> {l}</label>
            ))}
          </div>
        </details>
        <HelpLinks topic="trends">About reports</HelpLinks>
      </div>
    </main>
  );
}
