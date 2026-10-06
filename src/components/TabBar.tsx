import { NavLink } from 'react-router-dom';
import './TabBar.css';

// Tabs as in the native app/(tabs)/_layout.tsx: same titles, and icons drawn
// to resemble its SF Symbols (calendar, chart.bar.fill, star.fill, gear).
// Native tints the active tab with the Expo template's colour; here it's
// the app's --primary, so it also follows the theme and high contrast.

/** Polygon for a filled star, points computed rather than hand-typed. */
function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

/** Gear outline with 8 teeth plus a centre hole (evenodd fill). */
function gearPath(cx: number, cy: number): string {
  const teeth = 8;
  const rOuter = 10;
  const rInner = 7.6;
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const base = (Math.PI * 2 * i) / teeth;
    const half = Math.PI / teeth;
    for (const [a, r] of [
      [base - half * 0.55, rInner],
      [base - half * 0.35, rOuter],
      [base + half * 0.35, rOuter],
      [base + half * 0.55, rInner],
    ] as const) {
      pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
    }
  }
  const hole = 3.4;
  return `M${pts.join('L')}Z M${cx + hole},${cy} a${hole},${hole} 0 1,0 ${-2 * hole},0 a${hole},${hole} 0 1,0 ${2 * hole},0Z`;
}

const icons = {
  calendar: (
    <>
      <path d="M5 4h14a2.5 2.5 0 0 1 2.5 2.5V8h-19V6.5A2.5 2.5 0 0 1 5 4Z" />
      <path
        fillRule="evenodd"
        d="M2.5 8.5h19v10A2.5 2.5 0 0 1 19 21H5a2.5 2.5 0 0 1-2.5-2.5v-10Zm1.8 1.5v8.5c0 .4.3.7.7.7h14c.4 0 .7-.3.7-.7V10H4.3Z"
      />
      <rect x="6" y="11.5" width="2.4" height="2.2" rx=".5" />
      <rect x="10.8" y="11.5" width="2.4" height="2.2" rx=".5" />
      <rect x="15.6" y="11.5" width="2.4" height="2.2" rx=".5" />
      <rect x="6" y="15.4" width="2.4" height="2.2" rx=".5" />
      <rect x="10.8" y="15.4" width="2.4" height="2.2" rx=".5" />
    </>
  ),
  trends: (
    <>
      <rect x="3" y="12" width="4.5" height="9" rx="1.2" />
      <rect x="9.75" y="7" width="4.5" height="14" rx="1.2" />
      <rect x="16.5" y="3" width="4.5" height="18" rx="1.2" />
    </>
  ),
  milestones: <polygon points={starPoints(12, 12.6, 10.2, 4.3)} strokeLinejoin="round" />,
  settings: <path fillRule="evenodd" d={gearPath(12, 12)} />,
};

const tabs = [
  { to: '/', label: 'Check-in', icon: icons.calendar },
  { to: '/trends', label: 'Trends', icon: icons.trends },
  { to: '/milestones', label: 'Milestones', icon: icons.milestones },
  { to: '/settings', label: 'Settings', icon: icons.settings },
] as const;

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      <ul>
        {tabs.map((t) => (
          <li key={t.to}>
            <NavLink to={t.to} end={t.to === '/'} className="tab">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
                {t.icon}
              </svg>
              <span>{t.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
