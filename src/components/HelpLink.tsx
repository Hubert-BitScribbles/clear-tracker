import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Topics are Help article ids (see screens/Help.tsx). */
export type HelpTopic =
  | 'start' | 'intention' | 'trends' | 'estimates' | 'milestones' | 'backups'
  | 'install' | 'privacy' | 'sounds' | 'accessibility' | 'troubleshooting' | 'contact';

/** A quiet link that opens one Help article. */
export function HelpLink({ topic, children }: { topic: HelpTopic; children: ReactNode }) {
  return <Link className="help-link" to={`/settings/help?topic=${topic}`}>{children}</Link>;
}

/** Help and Resources together, for the foot of a screen. */
export function HelpLinks({ topic, children }: { topic: HelpTopic; children: ReactNode }) {
  return (
    <nav className="help-links" aria-label="Help and resources">
      <HelpLink topic={topic}>{children}</HelpLink>
      <Link className="help-link" to="/settings/resources">Support resources</Link>
    </nav>
  );
}
