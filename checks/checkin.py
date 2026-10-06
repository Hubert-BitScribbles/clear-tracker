# Check-in: the Intention card (title, wording, weeks before the first
# intention), month swipes, the track colour; Trends' week grid starting at
# the first intention; milestones on fixed numbers. Run against `npm run dev` (5173).
import datetime
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173/#"
results = []
def check(name, cond, detail=''): results.append((bool(cond), name, detail))

# First used the week of Mon 7 Sep 2026 (intention 3); August filled in afterwards.
SETUP = """async () => {
  const db = await import('/src/data/database.ts');
  const e = (iso, lv) => ({ id: iso, entry_date: iso, status: lv === 'clear' ? 'clear' : 'drinking',
    amount: lv === 'clear' ? null : lv, created_at: '2026-09-07T10:00:00Z', updated_at: '' });
  const days = [];
  for (let d = 24; d <= 31; d++) days.push(e(`2026-08-${d}`, 'clear'));
  days.push(e('2026-09-08', 'clear'), e('2026-09-09', 'a-few'),
            e('2026-09-14', 'clear'), e('2026-09-15', 'clear'), e('2026-09-16', 'clear'), e('2026-09-17', 'clear'),
            e('2026-10-05', 'clear'));
  await db.restoreFromBackup(days, [{ id: 'i', weekly_target: 3, effective_date: '2026-09-07',
    created_at: '2026-09-07T10:00:00Z', updated_at: '' }]);
  await db.setSetting('onboarding_complete', 'true');
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, timezone_id="America/Vancouver", has_touch=True, is_mobile=True)
    pg = ctx.new_page()
    pg.clock.install(time=datetime.datetime(2026, 10, 6, 10, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=-7))))
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(BASE + "/settings"); pg.wait_for_timeout(500)
    pg.evaluate(SETUP)
    pg.goto(BASE + "/"); pg.reload(); pg.wait_for_timeout(1200)

    card = pg.locator('.ci-align')
    def note(): return pg.locator('.ci-align-note').inner_text()
    check('card has an "Intention" heading and "Change ›"', pg.locator('.ci-align-title').inner_text() == 'Intention'
          and 'Change' in card.inner_text())
    check('this week, in progress: "so far — more to go"', note() == '1 clear day so far — 2 more to go this week.', note())
    track = pg.locator('.ci-track').evaluate("e => getComputedStyle(e).backgroundColor")
    check('track uses the track colour (visible in dark mode)', track == 'rgb(222, 225, 229)', track)

    def select(iso):
        pg.goto(BASE + f"/?year={iso[:4]}&month={int(iso[5:7])}"); pg.reload(); pg.wait_for_timeout(1000)
        pg.locator(f'.ci-grid button[aria-label^="{iso_label(iso)}"]').click(); pg.wait_for_timeout(500)
    def iso_label(iso):
        dt = datetime.date.fromisoformat(iso)
        return dt.strftime('%A, %B ') + str(dt.day)

    select('2026-08-26')
    t = card.inner_text()
    check('a week before the first intention: not measured, no bar', "isn’t measured" in note() and pg.locator('.ci-track').count() == 0
          and pg.locator('.ci-week-count').inner_text() == '7 clear days', t)
    check('August stat: no intention weeks → a dash', pg.locator('.ci-stat-value').nth(1).inner_text().strip() in ('—', '–', '-'),
          pg.locator('.ci-stat-value').nth(1).inner_text())
    select('2026-09-09')
    check('a missed past week: plain count', note() == '1 clear day that week.', note())
    select('2026-09-16')
    check('a past week beyond the intention', note() == 'Beyond your intention that week.', note())
    check('September stat counts only weeks with an intention: 1 of 3',
          pg.locator('.ci-stat-value').nth(1).inner_text().replace('\n', ' ') == '1 of 3', pg.locator('.ci-stat-value').nth(1).inner_text())

    # Swipes on the calendar
    pg.goto(BASE + "/"); pg.reload(); pg.wait_for_timeout(1000)
    title = lambda: pg.locator('.ci-month-title').inner_text()
    def swipe(dx, dy=0):
        box = pg.locator('.ci-grid').bounding_box()
        x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
        pg.evaluate("""([x, y, dx, dy]) => {
          const el = document.querySelector('.ci-grid');
          const t = (cx, cy) => new Touch({ identifier: 1, target: el, clientX: cx, clientY: cy });
          el.dispatchEvent(new TouchEvent('touchstart', { touches: [t(x, y)], changedTouches: [t(x, y)], bubbles: true }));
          el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(x + dx, y + dy)], bubbles: true }));
        }""", [x, y, dx, dy]); pg.wait_for_timeout(400)
    swipe(120); check('swipe right → previous month', title() == 'September 2026', title())
    swipe(-120); check('swipe left → next month', title() == 'October 2026', title())
    swipe(30); check('a short move doesn\'t change month', title() == 'October 2026')
    swipe(80, 120); check('a mostly vertical move doesn\'t change month', title() == 'October 2026')
    pg.locator('.ci-grid button[aria-label^="Monday, October 5"]').tap(); pg.wait_for_timeout(300)
    check('a tap still selects a day', pg.locator('.ci-grid button[aria-pressed="true"]').get_attribute('aria-label').startswith('Monday, October 5'))
    touch = pg.locator('.ci-grid').evaluate("e => getComputedStyle(e).touchAction")
    check('page still scrolls vertically over the calendar', touch == 'pan-y', touch)

    # Trends: the chart starts at the first intention
    pg.goto(BASE + "/trends"); pg.wait_for_timeout(1200)
    weeks = sorted(pg.locator('.wg-tile').evaluate_all("els => els.map(e => e.dataset.week)"))
    check('Trends chart starts at the first intention week', weeks and weeks[0] == '2026-09-07', weeks[:3])
    stat = pg.locator('div', has=pg.locator('.tr-stat-label', has_text='weeks met intention')).last.locator('.tr-stat-value').inner_text()
    check('At a glance: weeks met counted from the first intention (1 / 4)', stat.replace(' ', '') == '1/4', stat)
    rows = pg.locator('.wg-row').evaluate_all("els => els.map(e => e.querySelector('.wg-month').textContent + ':' + e.querySelector('.wg-sum').textContent)")
    check('week grid: a row per month, newest first; week in progress not counted until met', rows == ['Oct:0 of 1', 'Sep:1 of 3'], rows)
    tiles = pg.locator('.wg-row').first.locator('.wg-tile')
    tiles.last.click(); pg.wait_for_timeout(300)
    check('tapping a tile selects that week', 'Week of Oct 5' in pg.locator('.tr-detail-week').inner_text(), pg.locator('.tr-detail-week').inner_text())

    # Milestones: fixed clear-day numbers, no "clear days in <year>"
    pg.goto(BASE + "/milestones/all"); pg.wait_for_timeout(1200)
    t = pg.locator('main').inner_text()
    check('All milestones: fixed clear-day tiers (7, 14, 30 … 1,000 clear days)', '7 clear days' in t and '50 clear days' in t and '1000 clear days' in t
          and 'Scaled' not in t and 'clear days this year' not in t, t[:0])
    check('7 clear days earned on the 7th clear day (Aug 30, filled in)', 'Reached Aug 30' in t)
    pg.goto(BASE + "/milestones"); pg.wait_for_timeout(1200)
    t = pg.locator('main').inner_text()
    check('Up next uses the fixed numbers', '14 clear days' in t and ' clear days in 2026' not in t, t[:400])

    pg.goto(BASE + "/trends/review?year=2026&month=8"); pg.wait_for_timeout(1200)
    t = pg.locator('.rv-section', has=pg.locator('h2', has_text='Intention')).inner_text()
    check('August report: "came before your first intention"', 'before your first intention' in t, t)
    check('no page errors', not errors, errors)
    b.close()

for ok, name, detail in results:
    print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else f'  <- {detail}'))
print(sum(ok for ok, _, _ in results), '/', len(results), 'passed')
