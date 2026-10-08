// Telling other windows of the same record that something changed.
//
// Windows that share one record — two tabs of a browser, or Chrome's tab and
// its installed app — each keep what they've loaded on screen. Without this,
// a change in one shows in the other only after moving between screens, and
// a tap in the out-of-date window starts from what it shows.
//
// A write here sets a localStorage key; the browser fires a "storage" event
// in every *other* window of the same record (never in the writer), which
// works in every browser this app supports. Windows with separate records
// (Safari and its Dock app, an iPhone browser and its Home Screen app)
// don't share storage, so they never hear each other — as it should be.

const KEY = 'ct-data-changed';
let pending: ReturnType<typeof setTimeout> | null = null;

/** Call after a write; several writes in a row send one message. */
export function announceChange(): void {
  if (typeof window === 'undefined') return;
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    try {
      localStorage.setItem(KEY, `${Date.now()}-${Math.random()}`);
    } catch {
      // storage unavailable: other windows catch up when they reload
    }
  }, 30);
}

/** Runs cb when another window of the same record changes it. */
export function onRemoteChange(cb: () => void): () => void {
  const h = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener('storage', h);
  return () => window.removeEventListener('storage', h);
}
