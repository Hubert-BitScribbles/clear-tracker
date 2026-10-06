import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  applyAppearance,
  loadAppearance,
  onSystemThemeChange,
  saveAppearance,
  type Appearance,
} from './appearance';

type Ctx = Appearance & { setAppearance: (patch: Partial<Appearance>) => void };

const AppearanceContext = createContext<Ctx | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setState] = useState<Appearance>(loadAppearance);

  useEffect(() => {
    applyAppearance(appearance);
    saveAppearance(appearance);
    // Follow the OS live while set to "system".
    if (appearance.theme !== 'system') return;
    return onSystemThemeChange(() => applyAppearance(appearance));
  }, [appearance]);

  const setAppearance = (patch: Partial<Appearance>) =>
    setState((prev) => ({ ...prev, ...patch }));

  return (
    <AppearanceContext.Provider value={{ ...appearance, setAppearance }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): Ctx {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error('useAppearance must be used inside AppearanceProvider');
  return ctx;
}
