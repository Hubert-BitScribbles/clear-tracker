import './Badge.css';

type Props = {
  glyph: string;
  title: string;
  sub: string;
  earned: boolean;
  /** e.g. "×3", for milestones earned more than once. */
  chip?: string;
  /** 0–100; shown only while not yet earned. */
  progress?: number;
  /** All Milestones uses slightly larger badges and a heading-font title. */
  size?: 'main' | 'all';
};

/** One milestone: glyph circle, title and detail, optional progress or count. */
export function Badge({ glyph, title, sub, earned, chip, progress, size = 'main' }: Props) {
  return (
    <div className={`card badge badge-${size}`} data-earned={earned || undefined}>
      <span className="badge-circle" aria-hidden="true">{glyph}</span>
      <div className="badge-text">
        <p className="badge-title">
          {title}
          <span className="sr-only">{earned ? ', earned' : ', not yet earned'}</span>
        </p>
        <p className="badge-sub">{sub}</p>
        {!earned && progress !== undefined && (
          <div className="badge-track" aria-hidden="true">
            <div className="badge-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      {chip && <span className="badge-chip">{chip}</span>}
    </div>
  );
}
