# Sticky page heads (1.4.0): the title, tabs and period choices stay in view
# while a page scrolls; links to a section land below the head; print and
# short landscape screens don't stick. Section headings (1.4.1) stop under the
# head as they pass, each replacing the last. Run against the dev server (5173).
import datetime
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173/#"
NOW = datetime.datetime(2026, 11, 11, 13, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=-8)))
results = []
def check(name, ok, detail=''):
    results.append(ok); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else f'  [{detail}]'))

# Page, and what must be inside its head.
PAGES = [
    ('/', ['h1']),
    ('/trends', ['h1', '.seg-nav', '.tr-scope']),
    ('/trends/review?year=2026&month=10', ['h1', '.seg-nav', '.rv-kind', '.rv-title-row']),
    ('/milestones', ['h1', '.seg-nav', '.ms-scope']),
    ('/milestones/all', ['h1', '.ms-back']),
    ('/settings', ['h1', '.seg-nav']),
    ('/settings/about', ['h1', '.seg-nav']),
    ('/settings/help', ['h1', '.seg-nav']),
]

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, locale='en-CA', timezone_id='America/Vancouver')
    pg = ctx.new_page(); pg.clock.install(time=NOW)
    errors = []; pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE + "/settings"); pg.wait_for_timeout(600)
    pg.evaluate("""async () => { const db = await import('/src/data/database.ts'); const h = await import('/test/helpers.ts');
      const s = h.scenario(42, '2026-11-10', {}); await db.restoreFromBackup(s.entries, s.intentions);
      await db.setSetting('onboarding_complete', 'true'); await db.setSetting('report_hidden_sections', 'none'); }""")
    for path, parts in PAGES:
        pg.goto(BASE + path); pg.reload(); pg.wait_for_timeout(900)
        missing = [s for s in parts if not pg.locator('.page-head ' + s).count()]
        check(f'{path}: head holds {", ".join(parts)}', not missing, missing)
        pg.mouse.wheel(0, 1500); pg.wait_for_timeout(400)
        top = pg.locator('.page-head').bounding_box()['y']
        check(f'{path}: stays at the top when scrolled', pg.evaluate('scrollY') > 0 and abs(top) < 1 and pg.locator('.page-head[data-stuck]').count() == 1, top)
    # Section headings: each stops under the head as it passes, replacing the last.
    pg.goto(BASE + "/trends"); pg.reload(); pg.wait_for_timeout(900)
    heads = pg.locator('.sub-head')
    def showing():
        return pg.evaluate("(document.querySelector('.sub-head[data-stuck]') || {}).textContent || ''")
    for i in (0, 1, 2):
        y = pg.evaluate(f"(() => {{ const s = document.querySelectorAll('.sub-head')[{i}]; return s.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(s).top) + 40; }})()")
        pg.evaluate(f'window.scrollTo(0, {y})'); pg.wait_for_timeout(300)
        want = heads.nth(i).inner_text()
        check(f'Trends: "{want}" stops under the head', showing() == want, showing())
    check('Trends: earlier headings wait underneath, still readable by screen readers',
          pg.locator('.sub-head[data-under]').count() == 2 and pg.get_by_role('heading', name=heads.nth(0).inner_text()).count() == 1)
    pg.evaluate('window.scrollTo(0, 0)'); pg.wait_for_timeout(300)
    check('Trends: back at the top, no heading stopped', showing() == '' and pg.locator('.sub-head[data-under]').count() == 0)
    pg.goto(BASE + "/settings#savings"); pg.reload(); pg.wait_for_timeout(1100)
    hb = pg.locator('.page-head').bounding_box(); tb = pg.locator('#savings').bounding_box()
    check('a link to a section lands below the head', tb['y'] >= hb['y'] + hb['height'], (hb, tb))
    check('...and that heading is the one stopped under it', pg.locator('#savings[data-stuck]').count() == 1)
    pg.goto(BASE + "/trends/review?year=2026&month=10"); pg.reload(); pg.wait_for_timeout(900)
    pg.emulate_media(media='print')
    check('print: the head is not sticky', pg.evaluate("getComputedStyle(document.querySelector('.page-head')).position") == 'static')
    check('no page errors', not errors, errors[:2])
    ctx.close()
    ctx = b.new_context(viewport={"width": 844, "height": 390}); pg = ctx.new_page()
    pg.goto(BASE + "/trends"); pg.wait_for_timeout(900)
    check('short landscape screen: not sticky, no room reserved',
          pg.evaluate("getComputedStyle(document.querySelector('.page-head')).position") == 'static'
          and pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--head-h')") == '0px')
    ctx.close(); b.close()
print(f'{sum(results)} / {len(results)} passed')
