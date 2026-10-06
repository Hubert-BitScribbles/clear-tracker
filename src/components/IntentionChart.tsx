import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { WeekAlignment } from '../data/database';
import { addDays, mondayOf, todayIso } from '../data/dates';
import './IntentionChart.css';

const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const label = (iso: string) => `${SHORT[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;

/** A week measured against an intention (weeks before the first one aren't shown). */
export type MeasuredWeek = WeekAlignment & { target: number };
export const isMeasured = (w: WeekAlignment): w is MeasuredWeek => w.target !== null;

export type Alignment = 'unlogged' | 'partial' | 'met' | 'exceeded';
export function alignmentOf(w: MeasuredWeek): Alignment {
  if (!w.hasEntries) return 'unlogged';
  if (w.count > w.target) return 'exceeded';
  if (w.count >= w.target) return 'met';
  return 'partial';
}

export function weekLabel(w: MeasuredWeek): string {
  return `Week of ${label(w.weekStartIso)}: ${w.hasEntries ? `${w.count} of ${w.target} clear days, ${alignmentOf(w)}` : 'nothing logged'}`;
}

type Props = { weeks: MeasuredWeek[]; selected: string; onSelect: (weekStart: string) => void; year: number };

/**
 * The year's weeks as a grid: one row per month (a week belongs to the month
 * of its Thursday), newest month first, oldest week on the left. Each tile is
 * a week, coloured by how it went against the intention, with its clear days
 * as the number. "2 of 4" at the end of a row is that month's weeks met; the
 * week in progress counts only once it's met, as on Check-in.
 *
 * Replaced a bar per week, which looked bare with a few weeks and became too
 * narrow to read or tap past about half a year. Rows grow downward instead,
 * so a full year is 12 short rows, and each tile is a real button.
 *
 * Keyboard: one Tab stop (the selected week); arrow keys move between weeks
 * (left/right) and months (up/down), Home/End to the first and last week.
 */
export function IntentionChart({ weeks, selected, onSelect, year }: Props) {
  const grid = useRef<HTMLDivElement>(null);
  const moved = useRef(false); // focus follows the selection only after a key press

  // Rows: months, newest first; weeks oldest first within a row.
  const rows: { month: number; weeks: MeasuredWeek[] }[] = [];
  for (const w of weeks) {
    const m = Number(addDays(w.weekStartIso, 3).slice(5, 7));
    const row = rows.find((r) => r.month === m);
    if (row) row.weeks.push(w);
    else rows.push({ month: m, weeks: [w] });
  }
  rows.reverse();

  const current = mondayOf(todayIso());
  const idx = Math.max(0, weeks.findIndex((w) => w.weekStartIso === selected));
  const sel = weeks[idx]?.weekStartIso;

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-week="${sel}"]`)?.focus();
  }, [sel]);

  function key(e: KeyboardEvent<HTMLDivElement>) {
    const go = (i: number) => {
      e.preventDefault();
      moved.current = true;
      onSelect(weeks[Math.max(0, Math.min(weeks.length - 1, i))].weekStartIso);
    };
    // Up/down: the same column in the month above (newer) or below (older).
    const vertical = (dir: 1 | -1) => {
      const r = rows.findIndex((row) => row.weeks.some((w) => w.weekStartIso === sel));
      const col = rows[r].weeks.findIndex((w) => w.weekStartIso === sel);
      const target = rows[r - dir];
      if (!target) return e.preventDefault();
      go(weeks.indexOf(target.weeks[Math.min(col, target.weeks.length - 1)]));
    };
    if (e.key === 'ArrowLeft') go(idx - 1);
    else if (e.key === 'ArrowRight') go(idx + 1);
    else if (e.key === 'ArrowUp') vertical(1);
    else if (e.key === 'ArrowDown') vertical(-1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(weeks.length - 1);
  }

  return (
    <div className="wg" role="grid" aria-label={`Weeks of ${year}, by month`} ref={grid} onKeyDown={key}>
      {rows.map((r) => {
        const isMet = (w: MeasuredWeek) => alignmentOf(w) === 'met' || alignmentOf(w) === 'exceeded';
        const counted = r.weeks.filter((w) => w.weekStartIso < current || isMet(w));
        const met = counted.filter(isMet).length;
        return (
          <div key={r.month} className="wg-row" role="row">
            <span className="wg-month" role="rowheader" aria-label={LONG[r.month - 1]}>{SHORT[r.month - 1]}</span>
            <span className="wg-weeks" role="presentation">
              {r.weeks.map((w) => {
                const a = alignmentOf(w);
                const isSel = w.weekStartIso === sel;
                return (
                  <span key={w.weekStartIso} role="gridcell" className="wg-cell">
                    <button
                      type="button"
                      className={`wg-tile wg-${a}`}
                      data-week={w.weekStartIso}
                      data-selected={isSel || undefined}
                      tabIndex={isSel ? 0 : -1}
                      aria-pressed={isSel}
                      aria-label={weekLabel(w)}
                      onClick={() => onSelect(w.weekStartIso)}
                    >
                      <span aria-hidden="true">{w.hasEntries ? w.count : '–'}</span>
                    </button>
                  </span>
                );
              })}
            </span>
            <span className="wg-sum" role="gridcell">{counted.length ? `${met} of ${counted.length}` : ''}</span>
          </div>
        );
      })}
    </div>
  );
}
