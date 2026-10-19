import './TrendChart.css';
import { t } from '../i18n';

export interface TrendPoint {
  label: string; // "Sep"
  year: number; // shown under January, when the months cross into a new year
  month: number;
  full: string; // "September 2026"
  value: number | null; // null: not enough logged days
  soFar?: boolean;
  /** Extra words for screen readers, e.g. "20 of 30 days logged". */
  note?: string;
}

type Props = {
  points: TrendPoint[];
  kind: 'line' | 'bars';
  format: (v: number) => string;
  name: string; // what the chart shows, for screen readers
};

const W = 340;
const TOP = 14; // room for the value over the tallest bar
const PLOT = 64;
const H = TOP + PLOT + 26;

/**
 * Months at a glance for a report, made to be printed: every month's value is
 * written on the chart, so nothing needs tapping (the interactive chart is on
 * Trends). Bars for clear days, a line for drinks a week; months without
 * enough logged days are left blank, the month still running is outlined.
 */
export function TrendChart({ points, kind, format, name }: Props) {
  const vals = points.map((p) => p.value).filter((v): v is number => v !== null);
  const max = Math.max(1, ...vals);
  const step = W / Math.max(points.length, 6); // a short span keeps its bars narrow
  const x = (i: number) => step * i + step / 2;
  const y = (v: number) => TOP + PLOT - (v / max) * PLOT;
  const base = TOP + PLOT;
  const crossesYear = points.some((p) => p.year !== points[0].year);
  const segs: string[] = [];
  points.forEach((p, i) => {
    const q = points[i + 1];
    if (p.value !== null && q?.value != null) segs.push(`M${x(i)} ${y(p.value)} L${x(i + 1)} ${y(q.value)}`);
  });

  return (
    <div className="tc">
      <svg viewBox={`0 0 ${W} ${H}`} className="tc-svg" aria-hidden="true">
        <line x1={0} x2={W} y1={base} y2={base} className="tc-axis" />
        {kind === 'line' && segs.map((d) => <path key={d} d={d} className="tc-line" />)}
        {points.map((p, i) => {
          if (p.value === null) return <text key={i} x={x(i)} y={base - 4} className="tc-value tc-none" textAnchor="middle">–</text>;
          const top = y(p.value);
          return (
            <g key={i}>
              {kind === 'bars' ? (
                <rect x={x(i) - step * 0.32} y={Math.min(top, base - 1.5)} width={step * 0.64} height={Math.max(1.5, base - top)} rx={2}
                  className="tc-bar" data-sofar={p.soFar || undefined} />
              ) : (
                <circle cx={x(i)} cy={top} r={3} className={`tc-dot${p.soFar ? ' tc-dot-sofar' : ''}`} />
              )}
              <text x={x(i)} y={(kind === 'bars' ? Math.min(top, base - 1.5) : top) - 5} className="tc-value" textAnchor="middle">{format(p.value)}</text>
            </g>
          );
        })}
        {points.map((p, i) => (
          <g key={`l${i}`}>
            <text x={x(i)} y={base + 12} className="tc-month" textAnchor="middle">{p.label}</text>
            {crossesYear && (i === 0 || p.month === 1) && <text x={x(i)} y={base + 23} className="tc-year" textAnchor="middle">{p.year}</text>}
          </g>
        ))}
      </svg>
      {/* Every month, for screen readers (in a hidden box: a table ignores the 1px size and would widen the page). */}
      <div className="sr-only">
        <table>
          <caption>{name}</caption>
          <tbody>
            {points.map((p) => (
              <tr key={p.full}>
                <th scope="row">{p.full}{p.soFar ? t('chart.soFar') : ''}</th>
                <td>{p.value === null ? t('chart.notEnough') : format(p.value)}{p.note ? `, ${p.note}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
