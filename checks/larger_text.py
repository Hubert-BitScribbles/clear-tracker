# The phone's text size (1.5.0): every screen at 135% (iPhone's largest
# standard Larger Text step, 23px against 17px) and 200% (the cap, and the
# phone standard's zoom), at 390px and 320px wide. Fails on anything wider
# than the screen and on text cut off inside its box; also checks that the
# default size is unchanged and that --t follows the base size.
#   python3 checks/larger_text.py        (dev server on 5173)
# Safari's -apple-system-body can't be emulated in Chromium, so this sets --t
# the way base.css would on an iPhone; try the real setting on a phone too.
import datetime, json, os, re
from playwright.sync_api import sync_playwright

BASE = os.environ.get("CHECK_URL", "http://localhost:5173")
SRC = open(os.path.join(os.path.dirname(__file__), 'snapshots.py')).read()
exec(SRC[SRC.index('OB_FORWARD ='):SRC.index('REGIONAL =')])  # OB_FORWARD, ob(), STATES: the same screens as snapshots.py

res = []
def check(name, ok, detail=''):
    res.append(ok); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else f'  -> {detail}'))

def text_script(scale):
    return ("new MutationObserver((_, o) => { if (document.documentElement) { "
            f"document.documentElement.style.setProperty('--t', '{scale}px'); o.disconnect(); }} }})"
            ".observe(document, { childList: true });")

# Anything past the right edge, and text cut off by its own box (overflow not visible).
PROBLEMS = """() => {
  const W = document.documentElement.clientWidth, out = [];
  const name = (e) => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).join('.') : '');
  for (const e of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    if (cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0 || e.closest('svg, .sr-only, .visually-hidden')) continue;
    if (r.right > W + 1 && cs.position !== 'fixed') out.push('wider: ' + name(e) + ' ' + Math.round(r.right));
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (own && cs.display !== 'inline' && cs.overflowX !== 'clip' && e.scrollWidth > e.clientWidth + 1)
      out.push((cs.overflowX === 'visible' ? 'sticks out: ' : 'cut off: ') + name(e) + ' “' + e.textContent.trim().slice(0, 30) + '”');
  }
  if (document.documentElement.scrollWidth > W) out.push('page wider than the screen: ' + document.documentElement.scrollWidth);
  return [...new Set(out)].slice(0, 6);
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    # The default size is the size before 1.5.0, and --t follows the base size.
    ctx = b.new_context(viewport={"width": 390, "height": 844}); pg = ctx.new_page()
    pg.goto(BASE + "/#/settings/help"); pg.wait_for_timeout(800)
    check('default: body text 16px, as before', pg.evaluate("getComputedStyle(document.body).fontSize") == '16px')
    pg.evaluate("document.documentElement.style.fontSize = '20px'")
    check('a 20px base size (a desktop browser setting) gives 20px body text',
          pg.evaluate("getComputedStyle(document.body).fontSize") == '20px', pg.evaluate("getComputedStyle(document.body).fontSize"))
    ctx.close()
    ctx = b.new_context(viewport={"width": 390, "height": 844}); pg = ctx.new_page(); pg.add_init_script(text_script(1.5))
    pg.goto(BASE + "/#/settings/help"); pg.wait_for_timeout(800)
    check('--t at 1.5: body text 24px', pg.evaluate("getComputedStyle(document.body).fontSize") == '24px')
    css = pg.evaluate("[...document.styleSheets].flatMap(s => { try { return [...s.cssRules].map(r => r.cssText) } catch { return [] } }).join('\\n')")
    fixed = sorted(set(re.findall(r'(?:font-size|line-height): \d+(?:\.\d+)?(?:px|rem)', css)))
    check('every font-size and px line-height follows --t', not fixed, fixed[:5])
    ctx.close()

    for width in (390, 320):
        for scale in (1.35, 2):
            ctx = b.new_context(viewport={"width": width, "height": 844}, timezone_id="America/Vancouver", locale='en-CA')
            pg = ctx.new_page(); pg.add_init_script(text_script(scale)); errors = []
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.clock.install(time=datetime.datetime(2026, 9, 30, 20, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=-7))))
            pg.goto(BASE + "/#/settings"); pg.wait_for_timeout(400)
            pg.evaluate("""async () => { const db = await import('/src/data/database.ts'); const h = await import('/test/helpers.ts');
              const s = h.scenario(42, '2026-09-30', {}); await db.restoreFromBackup(s.entries, s.intentions); await db.setSetting('onboarding_complete', 'true');
              await db.setSetting('savings_baseline_per_week', '14'); await db.setSetting('savings_price_per_drink', '9');
              await db.setSetting('region', JSON.stringify({country: 'ca', province: 'ca_bc'}));
              await db.setChallenges({weekendRuns: [{from: '2026-06-05'}], weekRuns: [], months: ['2026-09', '2026-12']}); }""")
            for name, path, setup in STATES:
                pg.evaluate(f"async () => (await import('/src/data/database.ts')).setSetting('onboarding_complete', '{'false' if path == '/onboarding' else 'true'}')")
                pg.goto(BASE + "/#" + path); pg.reload(); pg.wait_for_timeout(700)
                if setup:
                    try: pg.evaluate(setup)
                    except Exception as e: print('setup failed:', name, str(e).splitlines()[0])
                    pg.wait_for_timeout(400)
                bad = pg.evaluate(PROBLEMS)
                check(f'{width}px, text {int(scale * 100)}%: {name} fits', not bad, bad)
            check(f'{width}px, text {int(scale * 100)}%: no page errors', not errors, errors[:2])
            ctx.close()
    b.close()

print(f'{sum(res)} / {len(res)} passed')
raise SystemExit(0 if all(res) else 1)
