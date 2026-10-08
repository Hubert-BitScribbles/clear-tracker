import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { CheckIn } from './screens/CheckIn';
import { Intention } from './screens/Intention';
import { Milestones } from './screens/Milestones';
import { Onboarding } from './screens/Onboarding';
import { Settings } from './screens/Settings';
import { Trends } from './screens/Trends';
import { AppearanceProvider } from './theme/AppearanceContext';
import { onRemoteChange } from './data/changes';

// HashRouter (#/trends) so any static host works with no server rewrite
// rules, and a reminder link to the bare site URL always lands on Check-in.
const AllMilestones = lazy(() => import('./screens/AllMilestones').then((m) => ({ default: m.AllMilestones })));
const Challenges = lazy(() => import('./screens/Challenges').then((m) => ({ default: m.Challenges })));
const Review = lazy(() => import('./screens/Review').then((m) => ({ default: m.Review })));
const About = lazy(() => import('./screens/About').then((m) => ({ default: m.About })));
const Help = lazy(() => import('./screens/Help').then((m) => ({ default: m.Help })));
const Resources = lazy(() => import('./screens/Resources').then((m) => ({ default: m.Resources })));
const Backup = lazy(() => import('./screens/Backup').then((m) => ({ default: m.Backup })));
const Restore = lazy(() => import('./screens/Restore').then((m) => ({ default: m.Restore })));
const ColourReference = lazy(() => import('./screens/ColourReference').then((m) => ({ default: m.ColourReference })));
export function App() {
  return (
    <AppearanceProvider>
      <HashRouter>
        {/* Occasional screens load on first use (and are cached for offline use). */}
        <Suspense fallback={<main />}>
        <ReloadOnRemoteChange>
        <Routes>
          <Route path="/" element={<CheckIn />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/trends/review" element={<Review />} />
          <Route path="/milestones" element={<Milestones />} />
          <Route path="/milestones/all" element={<AllMilestones />} />
          <Route path="/milestones/challenges" element={<Challenges />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/about" element={<About />} />
          <Route path="/settings/help" element={<Help />} />
          <Route path="/settings/resources" element={<Resources />} />
          <Route path="/settings/backup" element={<Backup />} />
          <Route path="/settings/restore" element={<Restore />} />
          {/* Addresses before 1.0.0-rc.5, kept so old links still work. */}
          <Route path="/settings/export" element={<Navigate to="/settings/backup" replace />} />
          <Route path="/settings/import" element={<Navigate to="/settings/restore" replace />} />
          <Route path="/intention" element={<Intention />} />
          {import.meta.env.DEV && (
            <Route path="/dev/colours" element={<ColourReference />} />
          )}
          <Route path="*" element={<CheckIn />} />
        </Routes>
        </ReloadOnRemoteChange>
        </Suspense>
        <TabBarUnlessOnboarding />
      </HashRouter>
    </AppearanceProvider>
  );
}

/** Onboarding is full-screen: no tab bar until it's done. */
function TabBarUnlessOnboarding() {
  return useLocation().pathname === '/onboarding' ? null : <TabBar />;
}

// Screens a remote change shouldn't interrupt: they hold typing (a
// passphrase) or a flow in progress. They pick the change up when left.
const KEEP = ['/onboarding', '/settings/backup', '/settings/restore'];

/**
 * When another window of the same record changes it (see data/changes.ts),
 * reload the screen on show by remounting it, so what's on screen — and the
 * next tap — reflect the stored record.
 */
function ReloadOnRemoteChange({ children }: { children: ReactNode }) {
  const path = useLocation().pathname;
  const [version, setVersion] = useState(0);
  const missed = useRef(false);
  const pathRef = useRef(path);
  pathRef.current = path;
  useEffect(
    () =>
      onRemoteChange(() => {
        if (KEEP.includes(pathRef.current)) missed.current = true;
        else setVersion((v) => v + 1);
      }),
    [],
  );
  useEffect(() => {
    if (missed.current && !KEEP.includes(path)) {
      missed.current = false;
      setVersion((v) => v + 1);
    }
  }, [path]);
  return <div key={version} style={{ display: 'contents' }}>{children}</div>;
}
