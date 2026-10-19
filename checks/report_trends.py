# Reports: the order of the sections, and the month-by-month trends (an
# option, left out until ticked). Run against the dev server (port 5173).
import datetime
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173/#"
NOW = datetime.datetime(2026, 9, 30, 20, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=-7)))
results = []
def check(name, ok, detail=''):
    results.append(ok); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else f'  [{detail}]'))

ORDER = ['The days', 'By day of week', 'Clear days, month by month', 'Estimated drinks',
         'Estimated drinks a week, month by month', 'Weeks by intention', 'Milestones']

def open_report(b, entries_js, path='/trends/review?year=2026&month=8', width=390):
    ctx = b.new_context(viewport={"width": width, "height": 844}, timezone_id='America/Vancouver', locale='en-CA')
    pg = ctx.new_page(); pg.clock.install(time=NOW)
    errors = []; pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE + "/settings"); pg.wait_for_timeout(600)
    pg.evaluate("async () => { const db = await import('/src/data/database.ts'); const h = await import('/test/helpers.ts');" + entries_js +
                " await db.setSetting('onboarding_complete', 'true'); }")
    pg.goto(BASE + path); pg.reload(); pg.wait_for_timeout(1100)
    return ctx, pg, errors

def headings(pg):
    return [h.strip() for h in pg.evaluate("[...document.querySelectorAll('.rv-sec')].map(h => h.textContent)")]

def tick_all(pg):
    pg.locator('.rv-include summary').click(); pg.wait_for_timeout(150)
    boxes = pg.locator('.rv-checks input')
    for i in range(boxes.count()):
        if not boxes.nth(i).is_checked(): boxes.nth(i).check(); pg.wait_for_timeout(80)
    pg.wait_for_timeout(250)

SCENARIO = "const s = h.scenario(42, '2026-09-30', {}); await db.restoreFromBackup(s.entries, s.intentions);"

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx, pg, errors = open_report(b, SCENARIO)
    check('trends are left out until ticked', headings(pg) == ['The days', 'By day of week', 'Estimated drinks', 'Weeks by intention'], headings(pg))
    pg.locator('.rv-include summary').click(); pg.wait_for_timeout(150)
    boxes = [x.strip() for x in pg.locator('.rv-checks label').all_inner_texts()]
    check('the boxes follow the order of the sections', boxes == ORDER, boxes)
    pg.locator('.rv-include summary').click(); pg.wait_for_timeout(150)
    tick_all(pg)
    check('days, day of week, clear-day trend, then drinks', headings(pg) == ORDER, headings(pg))
    clear = pg.locator('.rv-section', has=pg.locator('h2', has_text='Clear days, month by month')).inner_text()
    check('clear-day trend: 12 months to August, with 3- and 6-month comparisons',
          'September 2025 – August 2026' in clear and 'Last 3 months:' in clear and '% of logged days clear, against' in clear and 'Last 6 months:' in clear, clear[:300])
    drinks = pg.locator('.rv-section', has=pg.locator('h2', has_text='Estimated drinks a week, month by month')).inner_text()
    check('drinks trend: same months, drinks-a-week comparisons', 'September 2025 – August 2026' in drinks and 'drink' in drinks.split('Last 3 months:')[1], drinks[:300])
    check('one chart each, read out as a table', pg.locator('.tc').count() == 2 and pg.locator('.tc table tr').count() == 24)
    pg.reload(); pg.wait_for_timeout(1000)
    check('the choice is kept', headings(pg) == ORDER, headings(pg))
    pg.goto(BASE + "/trends/review?year=2026"); pg.wait_for_timeout(1000)
    yc = pg.locator('.rv-section', has=pg.locator('h2', has_text='Clear days, month by month')).inner_text()
    check('a year report charts its own months, up to now', 'January 2026 – September 2026' in yc, yc[:120])
    check('no page errors', not errors, errors[:2])
    ctx.close()

    # Narrow screen: nothing wider than the window.
    ctx, pg, errors = open_report(b, SCENARIO + " await db.setSetting('report_hidden_sections', 'none');", width=320)
    check('320px: no sideways scrolling', pg.evaluate("document.documentElement.scrollWidth - innerWidth") <= 0)
    ctx.close()

    # Someone who started in August: one month isn't a trend.
    one = ("const e = []; for (let d = 1; d <= 31; d++) { const iso = `2026-08-${String(d).padStart(2, '0')}`;"
           " e.push({ id: iso, entry_date: iso, status: d % 3 ? 'clear' : 'drinking', amount: d % 3 ? null : 'a-few', created_at: '', updated_at: '' }); }"
           " await db.restoreFromBackup(e, []); await db.setSetting('report_hidden_sections', 'none');")
    ctx, pg, errors = open_report(b, one)
    trend = pg.locator('.rv-section', has=pg.locator('h2', has_text='Clear days, month by month')).inner_text()
    check('one month logged: "Not enough months logged yet"', 'Not enough months logged yet to show a trend.' in trend and pg.locator('.tc').count() == 0, trend)
    check('no page errors (one month)', not errors, errors[:2])
    ctx.close()
    b.close()
print(f'{sum(results)} / {len(results)} passed')
