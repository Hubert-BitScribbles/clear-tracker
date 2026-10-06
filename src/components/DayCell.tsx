import type { DayLevel } from '../data/database';
import './DayCell.css';

/** Clay ticks per drinking level: the amount, shown without colour. */
export const TICKS: Record<DayLevel, number> = { clear: 0, 'a-few': 1, moderate: 2, 'a-lot': 3 };

type Props = {
  day: number;
  level: DayLevel | null;
  selected?: boolean;
  future?: boolean;
  /** Makes the cell a button. */
  onClick?: () => void;
  /** Spoken name for the button, e.g. "Wednesday, September 3, a few drinks". */
  label?: string;
  isToday?: boolean;
};

/**
 * One calendar cell. Layout from the native index.tsx: numeral centred,
 * mark pinned near the top; the selected day gets a bar under the numeral.
 *   clear     teal fill, dot
 *   a few     teal outline, 1 clay tick (still a drinking day)
 *   moderate  clay fill, 2 ticks
 *   a lot     clay fill, 3 ticks
 */
export function DayCell({ day, level, selected = false, future = false, onClick, label, isToday }: Props) {
  const ticks = level ? TICKS[level] : 0;
  const inner = (
    <div className={`day-inner${level ? ` day-${level}` : ''}`}>
      <span className="day-numeral" aria-hidden={label ? true : undefined}>{day}</span>
      {level === 'clear' && <span className="mark-dot" aria-hidden="true" />}
      {ticks > 0 && (
        <span className="mark-ticks" aria-hidden="true">
          {Array.from({ length: ticks }, (_, i) => <span key={i} className="mark-tick" />)}
        </span>
      )}
      {selected && <span className="selection-bar" aria-hidden="true" />}
    </div>
  );
  if (!onClick) {
    return <div className="day-cell" data-future={future || undefined}>{inner}</div>;
  }
  return (
    <button
      type="button"
      className="day-cell"
      data-future={future || undefined}
      disabled={future}
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
      aria-current={isToday ? 'date' : undefined}
    >
      {inner}
    </button>
  );
}
