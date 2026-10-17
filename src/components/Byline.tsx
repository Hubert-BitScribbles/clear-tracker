import './Byline.css';
import { t } from '../i18n';

// The bitScribbles byline, per the brand guide: "by" in muted mono,
// "<bit/>" in teal mono, "Scribbles" in Caveat — all on one line.
// Values from the native lib/Byline.tsx.
export function Byline() {
  return (
    <p className="byline">
      {/* A <p> can't carry an aria-label; screen readers read this instead. */}
      <span className="sr-only">{t('byline.spoken')}</span>
      <span className="byline-by" aria-hidden="true">{t('byline.by')} </span>
      <span className="byline-bit" aria-hidden="true">&lt;bit/&gt;</span>
      <span className="byline-scribbles" aria-hidden="true"> Scribbles</span>
    </p>
  );
}
