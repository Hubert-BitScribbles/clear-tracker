import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import './MonthlyChart.css';

export interface Point {
  label: string; // "Sep"
  full: string; // "September 2026"
  value: number | null; // null: not enough logged days
  soFar?: boolean;
}

type Props = {
  points: Point[];
  kind: 'line' | 'bars';
  format: (v: number) => string; // axis values and the spoken value
  name: string; // the control's name, e.g. "Months of 2026, estimated drinks a week"
  /** What to show below the chart for the selected month. */
  detail: (p: Point, index: number) => ReactNode;
};

const W = 340;
const H = 96;
const PAD_L = 30;
const PAD_B = 14;

/**
 * Twelve months at a glance: a line (drinks a week) or bars (amount saved,
 * below the axis when over baseline). Months without enough logged days are
 * left blank.
 *
 * Like the Intention chart, it's one control: a tap picks the nearest month;
 * keyboards and screen readers use it as a slider; the selected month's
 * details show below, with full-size previous/next buttons. It starts on the
 * latest month with data.
 */
export function MonthlyChart({ points, kind, format, name, detail }: Props) {
  const lastWithData = points.map((p) => p.value !== null).lastIndexOf(true);
  const [sel, setSel] = useState<number | null>(null);
  const idx = Math.min(points.length - 1, sel ?? (lastWithData >= 0 ? lastWithData : points.length - 1));
  const box = useRef<HTMLDivElement>(null);
  const go = (i: number) => setSel(Math.max(0, Math.min(points.length - 1, i)));

  const vals = points.map((p) => p.value).filter((v): v is number => v !== null);
  const max = Math.max(0, ...vals);
  const min = Math.min(0, ...vals);
  const span = max - min || 1;
  const plotH = H - PAD_B - 6;
  const y = (v: number) => 6 + ((max - v) / span) * plotH;
  const step = (W - PAD_L) / points.length;
  const x = (i: number) => PAD_L + step * i + step / 2;

  function pick(e: PointerEvent<HTMLDivElement>) {
    const r = box.current!.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W; // into chart units
    go(Math.floor((sx - PAD_L) / step));
  }
  function key(e: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = { ArrowLeft: idx - 1, ArrowDown: idx - 1, ArrowRight: idx + 1, ArrowUp: idx + 1, Home: 0, End: points.length - 1 };
    if (e.key in moves) {
      e.preventDefault();
      go(moves[e.key]);
    }
  }
  const spoken = (p: Point) => `${p.full}${p.soFar ? ', so far' : ''}: ${p.value === null ? 'not enough logged days' : format(p.value)}`;

  const segs: string[] = [];
  points.forEach((p, i) => {
    const q = points[i + 1];
    if (p.value !== null && q?.value != null) segs.push(`M${x(i)} ${y(p.value)} L${x(i + 1)} ${y(q.value)}`);
  });
  const cur = points[idx];

  return (
    <div className="mc">
      <div
        ref={box}
        className="mc-plot"
        role="slider"
        tabIndex={0}
        aria-label={name}
        aria-valuemin={1}
        aria-valuemax={points.length}
        aria-valuenow={idx + 1}
        aria-valuetext={spoken(cur)}
        onPointerDown={pick}
        onKeyDown={key}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="mc-svg" aria-hidden="true">
          <line x1={PAD_L} x2={W} y1={y(0)} y2={y(0)} className="mc-axis" />
          <text x={PAD_L - 4} y={y(max) + 4} className="mc-tick" textAnchor="end">{format(max)}</text>
          {min < 0 && <text x={PAD_L - 4} y={y(min) + 4} className="mc-tick" textAnchor="end">{format(min)}</text>}
          {min === 0 && <text x={PAD_L - 4} y={y(0) + 3} className="mc-tick" textAnchor="end">{format(0)}</text>}
          {kind === 'line' ? (
            <>
              {segs.map((d) => <path key={d} d={d} className="mc-line" />)}
              {points.map((p, i) => (p.value === null ? null : (
                <circle key={i} cx={x(i)} cy={y(p.value)} r={i === idx ? 5 : p.soFar ? 3.5 : 3}
                  className={`mc-dot${p.soFar ? ' mc-dot-sofar' : ''}${i === idx ? ' mc-dot-sel' : ''}`} />
              )))}
            </>
          ) : (
            points.map((p, i) => {
              if (p.value === null) return null;
              const top = Math.min(y(p.value), y(0));
              const h = Math.max(1.5, Math.abs(y(p.value) - y(0)));
              return <rect key={i} x={x(i) - step * 0.32} y={top} width={step * 0.64} height={h} rx={2}
                className={`mc-bar${p.value < 0 ? ' mc-bar-over' : ''}${i === idx ? ' mc-bar-sel' : ''}`} data-sofar={p.soFar || undefined} />;
            })
          )}
          {/* Selected month: a short teal bar under it, as on Check-in and the Intention chart. */}
          <rect x={x(idx) - step * 0.32} y={H - PAD_B + 1} width={step * 0.64} height={2.5} rx={1.2} className="mc-sel" />
          {points.map((p, i) => (
            <text key={`l${i}`} x={x(i)} y={H - 1} className={`mc-month${i === idx ? ' mc-month-sel' : ''}`} textAnchor="middle">{p.label[0]}</text>
          ))}
        </svg>
      </div>
      {/* Every month at once, for screen readers. Visually hidden; a table sizes
          itself to its content and ignores the 1px hidden size, so it sits in a
          hidden box (else it widens the page). */}
      <div className="sr-only">
        <table>
          <caption>{name}</caption>
          <tbody>
            {points.map((p) => (
              <tr key={p.full}>
                <th scope="row">{p.full}{p.soFar ? ' (so far)' : ''}</th>
                <td>{p.value === null ? 'not enough logged days' : format(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mc-detail" aria-live="polite">
        <div className="mc-detail-nav">
          <button type="button" className="mc-step" aria-label="Previous month" disabled={idx === 0} onClick={() => go(idx - 1)}>‹</button>
          <p className="mc-detail-title">{cur.full}{cur.soFar ? ' (so far)' : ''}</p>
          <button type="button" className="mc-step" aria-label="Next month" disabled={idx === points.length - 1} onClick={() => go(idx + 1)}>›</button>
        </div>
        {detail(cur, idx)}
      </div>
    </div>
  );
}
