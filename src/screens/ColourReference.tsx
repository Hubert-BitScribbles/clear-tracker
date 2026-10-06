import { Link } from 'react-router-dom';
import { DayCell } from '../components/DayCell';
import { Screen } from '../components/Screen';
import './ColourReference.css';

// Development-only page: every token from theme.ts, plus the calendar marks,
// so each theme and high contrast can be checked on a real phone. Switch
// modes in Settings and come back.

export const TOKENS = [
  'background', 'card-background', 'sheet-background', 'border', 'scrim',
  'text-primary', 'text-secondary', 'text-muted', 'on-accent',
  'on-card-primary', 'on-card-secondary', 'on-card-muted',
  'primary', 'primary-text', 'primary-light', 'track',
  'clear-fill', 'clear-mark', 'drinking-fill', 'drinking-mark', 'on-fill-text',
  'a-few-line', 'a-few-tick',
  'align-unlogged', 'align-unlogged-edge', 'align-partial', 'align-met', 'align-exceeded',
  'locked-fill', 'locked-glyph', 'danger', 'danger-bg',
];

const ALIGNMENT = [
  ['align-unlogged', 'Unlogged', ''],
  ['align-partial', 'Partial', ''],
  ['align-met', 'Met', '✓'],
  ['align-exceeded', 'Exceeded', '✦'],
] as const;

export function ColourReference() {
  return (
    <Screen title="Colour reference">
      <p>
        <Link to="/settings">Back to Settings</Link>
      </p>

      <section className="card ref-section">
        <h2>Calendar cells</h2>
        <p className="text-muted ref-note">
          Unlogged, clear, a few, moderate, a lot; then each selected; then a future day.
        </p>
        <div className="ref-cells">
          <DayCell day={1} level={null} />
          <DayCell day={2} level="clear" />
          <DayCell day={3} level="a-few" />
          <DayCell day={4} level="moderate" />
          <DayCell day={5} level="a-lot" />
          <DayCell day={6} level={null} />
          <DayCell day={7} level={null} />
          <DayCell day={8} level={null} selected />
          <DayCell day={9} level="clear" selected />
          <DayCell day={10} level="a-few" selected />
          <DayCell day={11} level="moderate" selected />
          <DayCell day={12} level="a-lot" selected />
          <DayCell day={13} level={null} future />
        </div>
      </section>

      <section className="card ref-section">
        <h2>Alignment</h2>
        <div className="ref-row">
          {ALIGNMENT.map(([token, label, glyph]) => (
            <span key={token} className="ref-labelled">
              <span className="ref-bar" style={{ background: `var(--${token})`, boxShadow: token === 'align-unlogged' ? 'inset 0 0 0 1px var(--align-unlogged-edge)' : undefined }} />
              <span className="text-muted">
                {label} {glyph}
              </span>
            </span>
          ))}
        </div>
      </section>

      <section className="card ref-section">
        <h2>Controls</h2>
        <div className="ref-row">
          <button type="button" className="btn btn-primary">Save intention</button>
          <button type="button" className="btn btn-danger">Erase all data</button>
        </div>
        <div className="ref-row">
          <button type="button" className="chip" aria-pressed="true">Selected</button>
          <button type="button" className="chip" aria-pressed="false">Unselected</button>
          <a href="#/dev/colours">A link</a>
        </div>
      </section>

      <section className="card ref-section">
        <h2>Tokens</h2>
        <p className="text-muted ref-note">Names match theme.ts (camelCase as kebab-case).</p>
        <ul className="ref-swatches">
          {TOKENS.map((t) => (
            <li key={t}>
              <span className="ref-swatch" style={{ background: `var(--${t})` }} />
              <code>--{t}</code>
            </li>
          ))}
        </ul>
      </section>
    </Screen>
  );
}
