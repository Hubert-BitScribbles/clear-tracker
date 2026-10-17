import { useEffect, useState } from 'react';
import { HelpLinks } from '../components/HelpLink';
import { Link } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { MilestonesNav } from '../components/SegmentNav';
import {
  getCurrentClearDayStreak, getLongestClearDayStreak, getSetting, getTimeline, GLYPH, type Earned, type NextUp,
} from '../data/database';
import { todayIso, yearOf } from '../data/dates';
import './Milestones.css';
import { t } from '../i18n';
import { dayMonth, monthYear } from '../i18n/format';

// Milestones, organised around time (October 2026 redesign):
// - a year selector (each year with data, plus All time), as in Trends;
// - Up next: the three milestones closest to being earned (current year and All time);
// - Earned: everything achieved in the chosen period, grouped by month, newest first.
// Every milestone by category, with all tiers, is on All milestones; challenges
// have their own page (the Milestones | Challenges switch).


interface Data {
  earned: Earned[];
  next: NextUp[];
  years: number[];
  dayStreak: { on: boolean; now: number; best: number };
}

export function Milestones() {
  const [data, setData] = useState<Data | null>(null);
  const thisYear = yearOf(todayIso());
  const [scope, setScope] = useState<number | 'all'>(thisYear);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [tl, dsOn, ds, lds] = await Promise.all([
        getTimeline(),
        getSetting('day_streak_enabled', 'false'),
        getCurrentClearDayStreak(),
        getLongestClearDayStreak(),
      ]);
      if (cancelled) return;
      setData({ earned: tl.earned, next: tl.next, years: tl.years, dayStreak: { on: dsOn === 'true', now: ds, best: Math.max(ds, lds) } });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return <main className="milestones" />;
  const hasData = data.years.length > 0;
  const years = data.years.includes(thisYear) ? data.years : [thisYear, ...data.years];
  const shown = data.earned.filter((m) => scope === 'all' || m.date.startsWith(String(scope))).reverse();
  // Group by month, newest first.
  const groups: { key: string; label: string; items: Earned[] }[] = [];
  for (const m of shown) {
    const key = m.date.slice(0, 7);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = { key, label: monthYear(Number(key.slice(5, 7)), Number(key.slice(0, 4))), items: [] };
      groups.push(g);
    }
    g.items.push(m);
  }
  const scopeLabel = scope === 'all' ? t('milestones.allTimeLower') : String(scope);

  return (
    <main className="milestones">
      <h1 className="ms-title">{t('milestones.title')}</h1>
      <MilestonesNav active="milestones" />
      <p className="ms-lede">{t('milestones.lede')}</p>

      {!hasData ? (
        <div className="ms-empty">
          <h2 className="ms-empty-title">{t('milestones.emptyTitle')}</h2>
          <p className="ms-empty-body">{t('milestones.emptyBody')}</p>
        </div>
      ) : (
        <>
          <div className="ms-scope" role="radiogroup" aria-label={t('milestones.period')}>
            {[...years.map((y) => [y, String(y)] as const), ['all', t('milestones.allTime')] as const].map(([v, l]) => (
              <button key={l} type="button" role="radio" aria-checked={scope === v} className="ms-scope-pill" onClick={() => setScope(v)}>
                {l}
              </button>
            ))}
          </div>

          {(scope === thisYear || scope === 'all') && (
            <>
              <h2 className="ms-sec">{t('milestones.upNext')}</h2>
              {data.dayStreak.on && (
                <Badge
                  glyph="●"
                  title={data.dayStreak.now > 0 ? t('milestones.dayStreak', { n: data.dayStreak.now }) : t('milestones.noDayStreak')}
                  sub={t('milestones.longest', { n: data.dayStreak.best })}
                  earned={data.dayStreak.now > 0}
                />
              )}
              {data.next.map((n) => (
                <Badge key={n.title} glyph={GLYPH[n.kind]} title={n.title} sub={n.sub} earned={false} progress={Math.round(n.progress * 100)} />
              ))}
            </>
          )}

          <h2 className="ms-sec">{t('milestones.earned', { scope: scopeLabel })}</h2>
          {groups.length === 0 ? (
            <p className="ms-note">{t('milestones.nothingEarned', { scope: scopeLabel })}</p>
          ) : (
            groups.map((g) => (
              <section key={g.key} className="ms-month" aria-label={t('milestones.monthLabel', { month: g.label, count: g.items.length })}>
                <h3 className="ms-month-title">
                  {g.label} <span className="ms-month-count">· {g.items.length}</span>
                </h3>
                <ul className="card ms-list">
                  {g.items.map((m) => (
                    <li key={m.title + m.date} className="ms-item">
                      <span className="ms-item-glyph" aria-hidden="true">{GLYPH[m.kind]}</span>
                      <span className="ms-item-title">{m.title}</span>
                      <span className="ms-item-date">{dayMonth(m.date)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}

      <Link className="ms-view-all" to="/milestones/all">
        {t('milestones.viewAll')}
      </Link>
      <HelpLinks topic="milestones">{t('milestones.howTheyWork')}</HelpLinks>
    </main>
  );
}
