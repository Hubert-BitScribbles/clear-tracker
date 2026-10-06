import { describe, expect, it } from 'vitest';
import { Data } from '../src/data/compute';
import { buildReport } from '../src/data/report';
import { earnedMilestones, upNext } from '../src/data/timeline';
import { scenario } from './helpers';

describe('earned milestones, one list', () => {
  const s = scenario(42, '2026-09-30');
  const d = new Data({ entries: s.entries as never, intentions: s.intentions as never });
  const all = earnedMilestones(d, '2026-09-30');
  it('dated, oldest first, nothing in the future, no duplicates', () => {
    expect(all.length).toBeGreaterThan(10);
    expect([...all].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))).toEqual(all);
    expect(all.every((m) => m.date <= '2026-09-30')).toBe(true);
    expect(new Set(all.map((m) => m.title + m.date)).size).toBe(all.length);
  });
  it('includes the firsts and the kinds the report used to miss', () => {
    const titles = all.map((m) => m.title);
    expect(titles).toContain('First clear day');
    expect(titles).toContain('Set your first intention');
  });
  it('Beyond target appears once a week exceeds its target', () => {
    // Target 2; the week of Sep 7 has 4 clear days.
    const e = (iso: string) => ({ id: iso, entry_date: iso, status: 'clear', amount: null, created_at: '', updated_at: '' }) as never;
    const d2 = new Data({
      entries: ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10'].map(e),
      intentions: [{ id: 'i', weekly_target: 2, effective_date: '2026-09-07', created_at: '2026-09-01T00:00:00Z', updated_at: '' }] as never,
    });
    expect(earnedMilestones(d2, '2026-09-30')).toContainEqual({ title: 'Beyond target', date: '2026-09-13', kind: 'growth' });
  });
  it('the month in review lists exactly the timeline for that month', () => {
    const r = buildReport(d, { year: 2026, month: 8 }, '2026-09-30', null);
    expect(r.milestones).toEqual(all.filter((m) => m.date.startsWith('2026-08')).map(({ title, date }) => ({ title, date })));
  });
});

describe('up next', () => {
  it('at most three, most nearly done first, none already earned', () => {
    const s = scenario(7, '2026-09-30');
    const d = new Data({ entries: s.entries as never, intentions: s.intentions as never });
    const n = upNext(d, '2026-09-30');
    expect(n.length).toBe(3);
    expect(n[0].progress).toBeGreaterThanOrEqual(n[1].progress);
    expect(n[1].progress).toBeGreaterThanOrEqual(n[2].progress);
    expect(n.every((x) => x.progress < 1)).toBe(true);
    const earned = new Set(earnedMilestones(d, '2026-09-30').map((m) => m.title));
    expect(n.some((x) => earned.has(x.title))).toBe(false);
  });
});
