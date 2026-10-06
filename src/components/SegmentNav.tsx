import { Link } from 'react-router-dom';
import './SegmentNav.css';

/**
 * Two related pages under one tab, switched like a segmented control:
 * Milestones | Challenges, Trends | Reports. Real links (each page has its
 * own address); the current one is marked for screen readers.
 */
export function SegmentNav({ label, items, current }: { label: string; items: { to: string; text: string }[]; current: string }) {
  return (
    <nav className="seg-nav rv-noprint" aria-label={label}>
      {items.map((i) => (
        <Link key={i.to} to={i.to} className="seg-nav-item" aria-current={i.text === current ? 'page' : undefined}>
          {i.text}
        </Link>
      ))}
    </nav>
  );
}

export const MilestonesNav = ({ active }: { active: 'milestones' | 'challenges' }) => (
  <SegmentNav
    label="Milestones and challenges"
    current={active === 'milestones' ? 'Milestones' : 'Challenges'}
    items={[{ to: '/milestones', text: 'Milestones' }, { to: '/milestones/challenges', text: 'Challenges' }]}
  />
);

export const TrendsNav = ({ active }: { active: 'trends' | 'reports' }) => (
  <SegmentNav
    label="Trends and reports"
    current={active === 'trends' ? 'Trends' : 'Reports'}
    items={[{ to: '/trends', text: 'Trends' }, { to: '/trends/review', text: 'Reports' }]}
  />
);
