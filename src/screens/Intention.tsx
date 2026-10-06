import { useEffect, useState } from 'react';
import { HelpLinks } from '../components/HelpLink';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCurrentWeeklyTarget, getIntentionHistory, saveIntention, weekHasEntries } from '../data/database';
import { addDays, daysBetween, isoOf, mondayOf, todayIso } from '../data/dates';
import './Intention.css';

// Port of the native app/intention.tsx. Differences:
// - Date maths via dates.ts (native's "days left" divided milliseconds by
//   24 hours, which slips across clock changes).
// - History lists the intention that actually applied from each date;
//   ones replaced before they took effect are left out.
// - A change already saved for next Monday is shown and preselected.
// - The footnote says earned milestones stay earned.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const formatFull = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};

/** Days from iso to the end of its month / year, inclusive. */
export function daysLeftInMonth(iso: string): number {
  const [y, m] = iso.split('-').map(Number);
  return daysBetween(iso, m === 12 ? isoOf(y + 1, 1, 1) : isoOf(y, m + 1, 1));
}
export function daysLeftInYear(iso: string): number {
  return daysBetween(iso, isoOf(Number(iso.slice(0, 4)) + 1, 1, 1));
}

/**
 * "about 19 clear days for the rest of the month, and about 63 for the rest
 * of the year". With under a week of the month left the month figure is 0
 * or 1, which reads oddly, so only the year is mentioned.
 */
export function Estimate({ target, from }: { target: number; from: string }) {
  const left = daysLeftInMonth(from);
  const month = Math.round((target / 7) * left);
  const year = Math.round((target / 7) * daysLeftInYear(from));
  return left < 7 ? (
    <>that's about <strong>{year}</strong> clear days for the rest of the year.</>
  ) : (
    <>
      that's about <strong>{month}</strong> clear days for the rest of the month, and about <strong>{year}</strong> for
      the rest of the year.
    </>
  );
}

export function Intention() {
  const navigate = useNavigate();
  const location = useLocation();
  const [target, setTarget] = useState(3);
  const [loading, setLoading] = useState(true);
  const [weekEmpty, setWeekEmpty] = useState(false);
  const [history, setHistory] = useState<{ weekly_target: number; effective_date: string }[]>([]);
  const [pending, setPending] = useState<{ weekly_target: number; effective_date: string } | null>(null);
  const today = todayIso();
  const monday = mondayOf(today);

  useEffect(() => {
    (async () => {
      const [current, has, hist] = await Promise.all([
        getCurrentWeeklyTarget(monday),
        weekHasEntries(monday, addDays(monday, 6)),
        getIntentionHistory(),
      ]);
      // Newest first, ties newest-created first: keep the first per date.
      const applied = hist.filter((h, i) => hist.findIndex((x) => x.effective_date === h.effective_date) === i);
      const future = applied.find((h) => h.effective_date > monday) ?? null;
      setPending(future);
      setTarget(future ? future.weekly_target : current);
      setWeekEmpty(!has);
      setHistory(applied);
      setLoading(false);
    })();
  }, [monday]);

  const close = () => (location.key === 'default' ? navigate('/') : navigate(-1));
  if (loading) return <main className="intention" />;

  const effective = weekEmpty ? monday : addDays(monday, 7);
  const [, em, ed] = effective.split('-').map(Number);
  const fill = ((target - 1) / 6) * 100;

  return (
    <main className="intention">
      <div className="in-header">
        <button type="button" className="in-close" onClick={close} aria-label="Close">✕</button>
        <h1 className="in-title">Your intention</h1>
        <span style={{ width: 36 }} />
      </div>

      <p className="in-desc">
        Set how many clear days you'd like to aim for each week. Moderation and full breaks are both valid goals.
      </p>

      <div className="in-number">
        <span className="in-big" aria-hidden="true">{target}</span>
        <span className="in-number-label">clear days per week</span>
      </div>

      <input
        type="range"
        className="in-slider"
        min={1}
        max={7}
        step={1}
        value={target}
        aria-label="Clear days per week"
        aria-valuetext={`${target} clear day${target === 1 ? '' : 's'} per week`}
        style={{ background: `linear-gradient(to right, var(--primary) ${fill}%, var(--track) ${fill}%)` }}
        onChange={(e) => setTarget(Number(e.target.value))}
      />

      {pending && (
        <p className="in-pending">
          Already set: {pending.weekly_target} a week from Monday, {MONTHS[Number(pending.effective_date.slice(5, 7)) - 1]}{' '}
          {Number(pending.effective_date.slice(8, 10))}.
        </p>
      )}

      <div className="in-callout">
        <p>
          {weekEmpty
            ? "You haven't logged anything yet this week, so this applies right away — "
            : `This applies starting Monday, ${MONTHS[em - 1]} ${ed} — `}
          <Estimate target={target} from={effective} />
        </p>
      </div>

      <p className="in-footnote">
        {weekEmpty
          ? "Since this week hasn't started yet for you, the new target applies immediately."
          : 'This week already has logged days, so the new target applies starting next week.'}{' '}
        Past weeks always keep the intention that was active at the time, and milestones you've earned stay earned.
      </p>

      <button
        type="button"
        className="btn btn-primary in-save"
        onClick={async () => {
          await saveIntention(target, effective);
          close();
        }}
      >
        Save intention
      </button>

      {history.length > 0 && (
        <div className="in-history">
          <p className="in-history-label">Last changed {formatFull(history[0].effective_date)}</p>
          <ul>
            {history.map((h) => (
              <li key={h.effective_date}>
                <span className="in-h-target">{h.weekly_target} days/week</span>
                <span className="in-h-date">
                  {h.effective_date > today ? 'from' : 'since'} {formatFull(h.effective_date)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <HelpLinks topic="intention">How intentions work</HelpLinks>
    </main>
  );
}
