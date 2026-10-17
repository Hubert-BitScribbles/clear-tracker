import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { captureInstallPrompt } from './lib/install';
import { loadMoneyCountry } from './lib/moneyRegion';

// Brand fonts, bundled with the app so they work offline once installed.
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-600.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/caveat/latin-700.css';

import './styles/tokens.css';
import './styles/base.css';

captureInstallPrompt();

// The currency follows the region; read it before the first screen draws.
loadMoneyCountry().finally(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
);
