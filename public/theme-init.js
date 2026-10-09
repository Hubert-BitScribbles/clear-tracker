// Runs before first paint (a blocking script in <head>) so the page never
// flashes the wrong theme. A separate file, not inline, so the security
// policy in public/_headers can allow scripts from this site only.
// Must stay in step with src/theme/appearance.ts.
(function () {
  var pref = { theme: 'system', highContrast: false };
  try {
    var saved = JSON.parse(localStorage.getItem('ct-appearance') || 'null');
    if (saved) pref = saved;
  } catch (e) {}
  var dark = pref.theme === 'dark' ||
    (pref.theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.contrast = pref.highContrast ? 'high' : 'normal';
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#14171C' : '#FAFAF9');
})();
