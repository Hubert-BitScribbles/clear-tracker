# The studio's phone standard ("Designing for phones — the bitScribbles way",
# brand guide, 12 November 2026), the parts a browser can measure:
# - touch targets at least 44 × 44 (links inside a sentence are exempt, as in
#   WCAG; the week tiles stay 40 × 40 with space between, a known exception);
# - inputs at 16px or more, and every input with a visible label;
# - nothing wider than the screen at 200% zoom (half a 390px phone).
# Run against the dev server (5173).
import datetime
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173/#"
NOW = datetime.datetime(2026, 11, 12, 13, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=-8)))
PAGES = ['/', '/trends', '/trends/review?year=2026&month=10', '/milestones', '/milestones/challenges', '/milestones/all',
         '/settings', '/settings/about', '/settings/help', '/settings/resources', '/intention', '/settings/backup', '/settings/restore']
results = []
def check(name, ok, detail=''):
    results.append(ok); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else f'  [{detail}]'))

SMALL = """() => {
  const out = [];
  for (const e of document.querySelectorAll('main button, main a[href], main input, main select, main textarea, main summary')) {
    if (e.closest('.sr-only') || e.classList.contains('sr-only')) continue;
    if (e.classList.contains('wg-tile')) continue;            // 40 x 40 with space between
    if (e.tagName === 'A' && e.closest('p, h2, li > span, .rv-footer') && !e.matches('.help-link, .sp-prog, .ci-note-link')) continue; // in a sentence
    // A checkbox counts with its label, which is what's tapped.
    const t = e.matches('input[type=checkbox], input[type=radio]') && e.closest('label') ? e.closest('label') : e;
    const r = t.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(e).visibility === 'hidden') continue;
    if (r.width < 43.5 || r.height < 43.5) out.push(`${e.tagName.toLowerCase()}.${[...e.classList].join('.')} ${Math.round(r.width)}x${Math.round(r.height)} "${(e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 24)}"`);
  }
  return out;
}"""
FIELDS = """() => [...document.querySelectorAll('main input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), main select, main textarea')].map(e => {
  const lab = e.id && document.querySelector(`label[for="${e.id}"]`) || e.closest('label');
  const visible = !!lab && !lab.classList.contains('sr-only') && lab.getBoundingClientRect().height > 0;
  return [e.id || e.className, parseFloat(getComputedStyle(e).fontSize), visible];
})"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, locale='en-CA', timezone_id='America/Vancouver')
    pg = ctx.new_page(); pg.clock.install(time=NOW)
    errors = []; pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE + "/settings"); pg.wait_for_timeout(700)
    pg.evaluate("""async () => { const db = await import('/src/data/database.ts'); const h = await import('/test/helpers.ts');
      const s = h.scenario(42, '2026-11-11', {}); await db.restoreFromBackup(s.entries, s.intentions);
      await db.setSetting('onboarding_complete', 'true'); await db.setSetting('report_hidden_sections', 'none'); }""")
    for path in PAGES:
        pg.goto(BASE + path); pg.reload(); pg.wait_for_timeout(900)
        if path.startswith('/trends/review'):
            pg.locator('.rv-include summary').click(); pg.wait_for_timeout(150)
        small = pg.evaluate(SMALL)
        check(f'{path}: every target 44 x 44', not small, small[:4])
        for fid, size, visible in pg.evaluate(FIELDS):
            check(f'{path}: {fid} at 16px or more, with a visible label', size >= 16 and visible, (size, visible))
    pg.set_viewport_size({"width": 195, "height": 422})
    for path in PAGES:
        pg.goto(BASE + path); pg.reload(); pg.wait_for_timeout(800)
        over = pg.evaluate("document.documentElement.scrollWidth - innerWidth")
        check(f'{path}: 200% zoom, nothing wider than the screen', over <= 0, over)
    check('no page errors', not errors, errors[:2])
    ctx.close(); b.close()
print(f'{sum(results)} / {len(results)} passed')
