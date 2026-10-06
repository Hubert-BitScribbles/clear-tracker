import { useEffect, useState } from 'react';
import { HelpLinks } from '../components/HelpLink';
import { MilestonesNav } from '../components/SegmentNav';
import { TierBadges } from '../components/TierBadges';
import { getChallengeStatus, setChallengeOn, setChallenges, tiersFrom, WEEK_TIERS, WEEKEND_TIERS } from '../data/database';
import { addDays, mondayOf, todayIso } from '../data/dates';
import { dayText, MONTH_LONG, monthStatusText, monthTitle, spanStatusText } from '../lib/challengeText';
import './Milestones.css';
import './Challenges.css';

// Challenges: optional, all-or-nothing goals the user takes on. Weekends and
// weeks start like an intention — this one if it hasn't started (nothing
// logged in it yet), otherwise the next — and only count from then on.

const SHORT = MONTH_LONG.map((m) => m.slice(0, 3));
const fmt = (iso: string) => `${SHORT[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;

export function Challenges() {
  const [st, setSt] = useState<Awaited<ReturnType<typeof getChallengeStatus>> | null>(null);
  const today = todayIso();
  const options = Array.from({ length: 13 }, (_, i) => {
    const y = Number(today.slice(0, 4));
    const m = Number(today.slice(5, 7)) - 1 + i;
    const ym = `${y + Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, '0')}`;
    return { ym, label: `${MONTH_LONG[m % 12]} ${y + Math.floor(m / 12)}` };
  });
  const [pick, setPick] = useState(options[0].ym);

  const load = async () => setSt(await getChallengeStatus());
  useEffect(() => {
    load();
  }, []);

  if (!st) return <main className="milestones" />;
  const available = options.filter((o) => !st.settings.months.includes(o.ym));

  /** "Starts this Friday, Oct 2" / "Starts next Monday, Oct 5 — this week already has logged days" */
  const startsText = (kind: 'weekend' | 'week', start: string) => {
    const thisOne = kind === 'weekend' ? addDays(mondayOf(today), 4) : mondayOf(today);
    return start === thisOne
      ? `Starts ${kind === 'weekend' ? 'this weekend' : 'this week'}, ${dayText(start)}`
      : `Starts ${dayText(start)} — ${kind === 'weekend' ? 'this Friday is already logged' : 'this week already has logged days'}`;
  };

  const section = (kind: 'weekend' | 'week') => {
    const on = kind === 'weekend' ? st.weekendOn : st.weekOn;
    const runStart = st.runStart[kind];
    const now = kind === 'weekend' ? st.weekendNow : st.weekNow;
    const earned = kind === 'weekend' ? st.weekends : st.weeks;
    const tiers = kind === 'weekend' ? WEEKEND_TIERS : WEEK_TIERS;
    const ever = (kind === 'weekend' ? st.settings.weekendRuns : st.settings.weekRuns).length > 0;
    const label = kind === 'weekend' ? 'Clear weekends' : 'Clear weeks';
    return (
      <section className="card ch-card" aria-labelledby={`ch-${kind}`}>
        <div className="ch-row">
          <div className="ch-row-text">
            <h2 id={`ch-${kind}`} className="ch-label">{label}</h2>
            <p className="ch-sub">{kind === 'weekend' ? 'Friday, Saturday and Sunday, all clear' : 'Monday to Sunday, all clear'}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={`Take on ${label.toLowerCase()}`}
            className="switch"
            onClick={async () => {
              await setChallengeOn(kind, !on);
              await load();
            }}
          >
            <span className="switch-thumb" />
          </button>
        </div>
        <div className="ch-detail">
          {on && runStart ? (
            <>
              <p className="ch-line">{runStart > today ? startsText(kind, runStart) : `Since ${dayText(runStart)}`}</p>
              {now && <p className="ch-line ch-now">{spanStatusText(now, kind)}</p>}
            </>
          ) : (
            <p className="ch-line">{startsText(kind, kind === 'weekend' ? st.weekendStartsIfOn : st.weekStartsIfOn)}, if you switch it on now.</p>
          )}
        </div>
        {ever && earned.length > 0 && (
          <div className="ch-badges">
            <TierBadges
              glyph="○"
              tiers={tiers}
              earned={tiersFrom(earned, tiers)}
              progress={earned.length}
              title={(t) => (t === 1 ? `A clear ${kind}` : `${t} clear ${kind}s`)}
              formatDate={fmt}
            />
          </div>
        )}
      </section>
    );
  };

  return (
    <main className="milestones">
      <h1 className="ms-title">Challenges</h1>
      <MilestonesNav active="challenges" />
      <p className="ch-intro">
        Optional goals you take on. They're all-or-nothing — one drinking day means that one isn't earned — which suits
        some people and not others. Like an intention, a weekend or week challenge starts with the next one that hasn't
        begun, and only counts from then.
      </p>

      {section('weekend')}
      {section('week')}

      <section className="card ch-card" aria-labelledby="ch-months">
        <div className="ch-row">
          <div className="ch-row-text">
            <h2 id="ch-months" className="ch-label">A clear month</h2>
            <p className="ch-sub">
              Pick a month to keep clear. Days you forget to log can be filled in afterwards. A chosen month is left out of
              the "first 3 months" savings baseline.
            </p>
          </div>
        </div>
        {st.months.map((c) => (
          <div key={c.ym} className="ch-row">
            <div className="ch-row-text">
              <span className="ch-month">{monthTitle(c.ym)}</span>
              <p className="ch-sub">{monthStatusText(c)}</p>
            </div>
            <button
              type="button"
              className="ch-remove"
              aria-label={`Remove ${monthTitle(c.ym)}`}
              onClick={async () => {
                await setChallenges({ ...st.settings, months: st.settings.months.filter((m) => m !== c.ym) });
                await load();
              }}
            >
              Remove
            </button>
          </div>
        ))}
        {available.length > 0 && (
          <div className="ch-row ch-add">
            <label className="sr-only" htmlFor="ch-month">Month to add</label>
            <select id="ch-month" className="ch-select" value={available.some((o) => o.ym === pick) ? pick : available[0].ym} onChange={(e) => setPick(e.target.value)}>
              {available.map((o) => <option key={o.ym} value={o.ym}>{o.label}</option>)}
            </select>
            <button
              type="button"
              className="btn btn-primary ch-add-btn"
              onClick={async () => {
                const ym = available.some((o) => o.ym === pick) ? pick : available[0].ym;
                await setChallenges({ ...st.settings, months: [...st.settings.months, ym] });
                await load();
              }}
            >
              Add
            </button>
          </div>
        )}
      </section>
      <HelpLinks topic="milestones">How challenges work</HelpLinks>
    </main>
  );
}
