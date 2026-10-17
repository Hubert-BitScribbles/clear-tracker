import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpLinks } from '../components/HelpLink';
import { MilestonesNav } from '../components/SegmentNav';
import { TierBadges } from '../components/TierBadges';
import { getChallengeStatus, setChallengeOn, setChallenges, tiersFrom, WEEK_TIERS, WEEKEND_TIERS } from '../data/database';
import { addDays, mondayOf, todayIso } from '../data/dates';
import { dayText, monthStatusText, monthTitle, spanStatusText } from '../lib/challengeText';
import './Milestones.css';
import './Challenges.css';
import { rich, t, type Key } from '../i18n';
import { dayMonth, monthYear } from '../i18n/format';

// Challenges: optional, all-or-nothing goals the user takes on. Weekends and
// weeks start like an intention — this one if it hasn't started (nothing
// logged in it yet), otherwise the next — and only count from then on.

const fmt = dayMonth;

export function Challenges() {
  const [st, setSt] = useState<Awaited<ReturnType<typeof getChallengeStatus>> | null>(null);
  const today = todayIso();
  const options = Array.from({ length: 13 }, (_, i) => {
    const y = Number(today.slice(0, 4));
    const m = Number(today.slice(5, 7)) - 1 + i;
    const ym = `${y + Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, '0')}`;
    return { ym, label: monthYear((m % 12) + 1, y + Math.floor(m / 12)) };
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
      ? t(`challenges.startsThis.${kind}` as Key, { date: dayText(start) })
      : t(`challenges.startsLater.${kind}` as Key, { date: dayText(start) });
  };

  const section = (kind: 'weekend' | 'week') => {
    const on = kind === 'weekend' ? st.weekendOn : st.weekOn;
    const runStart = st.runStart[kind];
    const now = kind === 'weekend' ? st.weekendNow : st.weekNow;
    const earned = kind === 'weekend' ? st.weekends : st.weeks;
    const tiers = kind === 'weekend' ? WEEKEND_TIERS : WEEK_TIERS;
    const ever = (kind === 'weekend' ? st.settings.weekendRuns : st.settings.weekRuns).length > 0;
    const label = t(`challenges.label.${kind}` as Key);
    return (
      <section className="card ch-card" aria-labelledby={`ch-${kind}`}>
        <div className="ch-row">
          <div className="ch-row-text">
            <h2 id={`ch-${kind}`} className="ch-label">{label}</h2>
            <p className="ch-sub">{t(`challenges.sub.${kind}` as Key)}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={t(`challenges.takeOn.${kind}` as Key)}
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
              <p className="ch-line">{runStart > today ? startsText(kind, runStart) : t('challenges.since', { date: dayText(runStart) })}</p>
              {now && <p className="ch-line ch-now">{spanStatusText(now, kind)}</p>}
            </>
          ) : (
            <p className="ch-line">{t('challenges.ifOn', { starts: startsText(kind, kind === 'weekend' ? st.weekendStartsIfOn : st.weekStartsIfOn) })}</p>
          )}
        </div>
        {ever && earned.length > 0 && (
          <div className="ch-badges">
            <TierBadges
              glyph="○"
              tiers={tiers}
              earned={tiersFrom(earned, tiers)}
              progress={earned.length}
              title={(n) => kind === 'weekend' ? (n === 1 ? t('ms.clearWeekend1') : t('ms.clearWeekendN', { n })) : (n === 1 ? t('ms.clearWeek1') : t('ms.clearWeekN', { n }))}
              formatDate={fmt}
            />
          </div>
        )}
      </section>
    );
  };

  return (
    <main className="milestones">
      <h1 className="ms-title">{t('challenges.title')}</h1>
      <MilestonesNav active="challenges" />
      <p className="ch-intro">{t('challenges.intro')}</p>
      <p className="ch-intro">{rich('challenges.caution', { link: (c) => <Link to="/settings/resources">{c}</Link> })}</p>

      {section('weekend')}
      {section('week')}

      <section className="card ch-card" aria-labelledby="ch-months">
        <div className="ch-row">
          <div className="ch-row-text">
            <h2 id="ch-months" className="ch-label">{t('challenges.month')}</h2>
            <p className="ch-sub">{t('challenges.monthSub')}</p>
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
              aria-label={t('challenges.removeLabel', { title: monthTitle(c.ym) })}
              onClick={async () => {
                await setChallenges({ ...st.settings, months: st.settings.months.filter((m) => m !== c.ym) });
                await load();
              }}
            >
              {t('challenges.remove')}
            </button>
          </div>
        ))}
        {available.length > 0 && (
          <div className="ch-row ch-add">
            <label className="sr-only" htmlFor="ch-month">{t('challenges.monthToAdd')}</label>
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
              {t('challenges.add')}
            </button>
          </div>
        )}
      </section>
      <HelpLinks topic="milestones">{t('challenges.howTheyWork')}</HelpLinks>
    </main>
  );
}
