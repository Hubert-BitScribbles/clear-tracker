import { Link } from 'react-router-dom';
import './SegmentNav.css';
import { t } from '../i18n';

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
    label={t('nav.milestonesAndChallenges')}
    current={active === 'milestones' ? t('nav.milestones') : t('nav.challenges')}
    items={[{ to: '/milestones', text: t('nav.milestones') }, { to: '/milestones/challenges', text: t('nav.challenges') }]}
  />
);

export const TrendsNav = ({ active }: { active: 'trends' | 'reports' }) => (
  <SegmentNav
    label={t('nav.trendsAndReports')}
    current={active === 'trends' ? t('nav.trends') : t('nav.reports')}
    items={[{ to: '/trends', text: t('nav.trends') }, { to: '/trends/review', text: t('nav.reports') }]}
  />
);
