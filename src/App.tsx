import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { CheckIn } from './screens/CheckIn';
import { Intention } from './screens/Intention';
import { Milestones } from './screens/Milestones';
import { Onboarding } from './screens/Onboarding';
import { Settings } from './screens/Settings';
import { Trends } from './screens/Trends';
import { AppearanceProvider } from './theme/AppearanceContext';

// HashRouter (#/trends) so any static host works with no server rewrite
// rules, and a reminder link to the bare site URL always lands on Check-in.
const AllMilestones = lazy(() => import('./screens/AllMilestones').then((m) => ({ default: m.AllMilestones })));
const Challenges = lazy(() => import('./screens/Challenges').then((m) => ({ default: m.Challenges })));
const Review = lazy(() => import('./screens/Review').then((m) => ({ default: m.Review })));
const About = lazy(() => import('./screens/About').then((m) => ({ default: m.About })));
const Help = lazy(() => import('./screens/Help').then((m) => ({ default: m.Help })));
const Resources = lazy(() => import('./screens/Resources').then((m) => ({ default: m.Resources })));
const Export = lazy(() => import('./screens/Export').then((m) => ({ default: m.Export })));
const Import = lazy(() => import('./screens/Import').then((m) => ({ default: m.Import })));
const ColourReference = lazy(() => import('./screens/ColourReference').then((m) => ({ default: m.ColourReference })));
export function App() {
  return (
    <AppearanceProvider>
      <HashRouter>
        {/* Occasional screens load on first use (and are cached for offline use). */}
        <Suspense fallback={<main />}>
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
          <Route path="/settings/export" element={<Export />} />
          <Route path="/settings/import" element={<Import />} />
          <Route path="/intention" element={<Intention />} />
          {import.meta.env.DEV && (
            <Route path="/dev/colours" element={<ColourReference />} />
          )}
          <Route path="*" element={<CheckIn />} />
        </Routes>
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
