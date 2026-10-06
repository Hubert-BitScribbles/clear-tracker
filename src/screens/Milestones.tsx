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

// Milestones, organised around time (October 2026 redesign):
// - a year selector (each year with data, plus All time), as in Trends;
// - Up next: the three milestones closest to being earned (current year and All time);
// - Earned: everything achieved in the chosen period, grouped by month, newest first.
// Every milestone by category, with all tiers, is on All milestones; challenges
// have their own page (the Milestones | Challenges switch).

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = MONTHS.map((m) => m.slice(0, 3));

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
      const [t, dsOn, ds, lds] = await Promise.all([
        getTimeline(),
        getSetting('day_streak_enabled', 'false'),
        getCurrentClearDayStreak(),
        getLongestClearDayStreak(),
      ]);
      if (cancelled) return;
      setData({ earned: t.earned, next: t.next, years: t.years, dayStreak: { on: dsOn === 'true', now: ds, best: Math.max(ds, lds) } });
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
      g = { key, label: `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`, items: [] };
      groups.push(g);
    }
    g.items.push(m);
  }
  const scopeLabel = scope === 'all' ? 'all time' : String(scope);

  return (
    <main className="milestones">
      <h1 className="ms-title">Milestones</h1>
      <MilestonesNav active="milestones" />
      <p className="ms-lede">A record of what you've done, not a score. Drinking days don't undo anything here.</p>

      {!hasData ? (
        <div className="ms-empty">
          <h2 className="ms-empty-title">Nothing here yet</h2>
          <p className="ms-empty-body">
            Milestones appear as you log days. Start with today on the Check-in tab — a drinking day counts just as much
            as a clear one.
          </p>
        </div>
      ) : (
        <>
          <div className="ms-scope" role="radiogroup" aria-label="Period">
            {[...years.map((y) => [y, String(y)] as const), ['all', 'All time'] as const].map(([v, l]) => (
              <button key={l} type="button" role="radio" aria-checked={scope === v} className="ms-scope-pill" onClick={() => setScope(v)}>
                {l}
              </button>
            ))}
          </div>

          {(scope === thisYear || scope === 'all') && (
            <>
              <h2 className="ms-sec">Up next</h2>
              {data.dayStreak.on && (
                <Badge
                  glyph="●"
                  title={data.dayStreak.now > 0 ? `Clear day streak: ${data.dayStreak.now} days` : 'No clear day streak right now'}
                  sub={`Longest ${data.dayStreak.best}`}
                  earned={data.dayStreak.now > 0}
                />
              )}
              {data.next.map((n) => (
                <Badge key={n.title} glyph={GLYPH[n.kind]} title={n.title} sub={n.sub} earned={false} progress={Math.round(n.progress * 100)} />
              ))}
            </>
          )}

          <h2 className="ms-sec">Earned · {scopeLabel}</h2>
          {groups.length === 0 ? (
            <p className="ms-note">Nothing earned in {scopeLabel} yet.</p>
          ) : (
            groups.map((g) => (
              <section key={g.key} className="ms-month" aria-label={`${g.label}: ${g.items.length} milestone${g.items.length === 1 ? '' : 's'}`}>
                <h3 className="ms-month-title">
                  {g.label} <span className="ms-month-count">· {g.items.length}</span>
                </h3>
                <ul className="card ms-list">
                  {g.items.map((m) => (
                    <li key={m.title + m.date} className="ms-item">
                      <span className="ms-item-glyph" aria-hidden="true">{GLYPH[m.kind]}</span>
                      <span className="ms-item-title">{m.title}</span>
                      <span className="ms-item-date">{SHORT[Number(m.date.slice(5, 7)) - 1]} {Number(m.date.slice(8, 10))}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}

      <Link className="ms-view-all" to="/milestones/all">
        All milestones, by category →
      </Link>
      <HelpLinks topic="milestones">How milestones work</HelpLinks>
    </main>
  );
}
