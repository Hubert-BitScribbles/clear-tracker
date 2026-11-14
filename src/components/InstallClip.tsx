import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { isInstalled } from '../lib/install';
import './InstallClip.css';

// A short how-to video beside the written install steps, never instead of
// them (1.6.0). Closed until "Show me how" is tapped (Hugh, 14 November 2026:
// option B, so the install step stays as it was and only people who want
// help download it). The clips are drawn from Hugh's own screen recordings;
// sources in the Project, claude/platform/install-clips/.
//
// The whole file is fetched and played from memory (a blob: address) rather
// than streamed: iPhone Safari only plays a streamed video if the server
// answers its byte-range requests just so, which Cloudflare doesn't promise
// for every setup. About 0.5 MB, only after the tap; not precached (the
// service worker's globPatterns leave out .mp4 and .jpg).

export type Clip = 'safari' | 'chrome';

const CLIPS: Record<Clip, { src: string; poster: string; seconds: number }> = {
  safari: { src: '/clips/install-iphone-safari.mp4', poster: '/clips/install-iphone-safari.jpg', seconds: 26 },
  chrome: { src: '/clips/install-iphone-chrome.mp4', poster: '/clips/install-iphone-chrome.jpg', seconds: 24 },
};

const BROWSER: Record<Clip, string> = { safari: 'Safari', chrome: 'Chrome' };

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function InstallClip({ which }: { which: Clip }) {
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const clip = CLIPS[which];
  const still = reducedMotion();

  useEffect(() => {
    if (!open) return;
    let url: string | undefined;
    let gone = false;
    fetch(clip.src)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((b) => {
        if (gone) return;
        url = URL.createObjectURL(new Blob([b], { type: 'video/mp4' }));
        setSrc(url);
      })
      .catch(() => {
        if (!gone) setFailed(true);
      });
    return () => {
      gone = true;
      if (url) URL.revokeObjectURL(url);
      setSrc(null);
      setFailed(false);
    };
  }, [open, clip.src]);

  // iPhone plays a video by itself only if it's muted; React sets the
  // property but not the attribute, so set both.
  const setVideo = (el: HTMLVideoElement | null) => {
    if (el) {
      el.muted = true;
      el.defaultMuted = true;
      el.setAttribute('muted', '');
    }
  };

  if (isInstalled()) return null;

  return (
    <div className="ic">
      <button type="button" className="ic-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? (
          t('install.clip.hide')
        ) : (
          <>
            <span aria-hidden="true">▶&#xFE0E;</span> {t('install.clip.show')}{' '}
            <span className="ic-length">· {t('install.clip.length', { seconds: clip.seconds })}</span>
          </>
        )}
      </button>
      {open &&
        (failed ? (
          <p className="ic-note">{t('install.clip.offline')}</p>
        ) : (
          <figure className="ic-frame">
            <video
              ref={setVideo}
              src={src ?? undefined}
              poster={clip.poster}
              muted
              loop
              playsInline
              autoPlay={!still}
              controls={still}
              preload="auto"
              aria-label={t(which === 'safari' ? 'install.clip.labelSafari' : 'install.clip.labelChrome')}
            />
            <figcaption>{t('install.clip.caption', { browser: BROWSER[which] })}</figcaption>
          </figure>
        ))}
    </div>
  );
}
