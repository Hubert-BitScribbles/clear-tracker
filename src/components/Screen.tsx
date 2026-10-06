import type { ReactNode } from 'react';
import './Screen.css';

type Props = { title: string; header?: ReactNode; children: ReactNode };

/** Page wrapper: title block, then content in a centred column. */
export function Screen({ title, header, children }: Props) {
  return (
    <main className="screen">
      <header className="screen-header">
        {header ?? <h1>{title}</h1>}
      </header>
      <div className="screen-body">{children}</div>
    </main>
  );
}
