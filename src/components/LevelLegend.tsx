import './LevelLegend.css';

type Levels = { clear: number; 'a-few': number; moderate: number; 'a-lot': number };

/**
 * The four levels with their counts for the period, as a legend for the
 * stacked bars (Month by month, Day of week) in Trends and the report.
 * Moderate and A lot share the clay swatch, as they share a segment.
 */
export function LevelLegend({ levels }: { levels: Levels }) {
  return (
    <p className="lvl-legend">
      <span><span className="lvl-sw lvl-clear" />Clear {levels.clear}</span>
      <span><span className="lvl-sw lvl-few" />A few {levels['a-few']}</span>
      <span><span className="lvl-sw lvl-more" />Moderate {levels.moderate}</span>
      <span><span className="lvl-sw lvl-more" />A lot {levels['a-lot']}</span>
    </p>
  );
}
