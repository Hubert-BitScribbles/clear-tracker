# 1.0.0-rc.5: windows of the same record stay in step; the new-milestone
# line on Check-in; Trends compares the selected month with the one before;
# Backup / Restore names and old addresses. Run against `npm run dev` (5173).
import datetime
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173/#"
res = []
def check(n, c, d=''): res.append((bool(c), n, d))
NOW = datetime.datetime(2026, 9, 30, 20, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=-7)))

def seed(pg, extra=''):
    pg.evaluate("""async () => { const db = await import('/src/data/database.ts'); const h = await import('/test/helpers.ts');
      const s = h.scenario(42, '2026-09-30', {}); await db.restoreFromBackup(s.entries, s.intentions);
      await db.setSetting('onboarding_complete', 'true'); """ + extra + """ }""")

def level_of(pg, day):
    return pg.locator(f'.day-cell[aria-label^="{day}"]').first.get_attribute('aria-label') or ''

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---- Two windows of one record (two tabs, as Chrome's tab + installed app)
    ctx = b.new_context(viewport={"width": 390, "height": 844}, timezone_id="America/Vancouver")
    a = ctx.new_page(); a.clock.install(time=NOW)
    a.goto(BASE + "/settings"); a.wait_for_timeout(500)
    a.evaluate("""async () => { const db = await import('/src/data/database.ts'); await db.resetDatabase();
      await db.saveIntention(3, '2026-09-28'); await db.setSetting('onboarding_complete', 'true'); }""")
    a.goto(BASE + "/"); a.reload(); a.wait_for_timeout(1000)
    c = ctx.new_page(); c.clock.install(time=NOW)
    c.goto(BASE + "/"); c.wait_for_timeout(1000)
    # Today (Sep 30) is already selected on Check-in: one tap logs it Clear.
    cell_a = a.locator('.day-cell').filter(has_text='30').last
    cell_a.click(); a.wait_for_timeout(600)
    stored = c.evaluate("async () => (await (await import('/src/data/database.ts')).getEntryCount())")
    check('sync: window A logged a day', stored == 1, stored)
    clear_c = c.locator('.day-cell.day-clear, .day-cell .day-clear').count()
    check('sync: window B shows it without a refresh', clear_c >= 1, clear_c)
    # Window B taps the same day: steps Clear → A few (not a failed second add).
    cell_c = c.locator('.day-cell').filter(has_text='30').last
    cell_c.click(); c.wait_for_timeout(600)
    lv = c.evaluate("async () => { const db = await import('/src/data/database.ts'); return (await db.getMonthCells(2026, 9))['2026-09-30']; }")
    check('sync: a tap in window B steps from the stored level', lv and lv.get('amount') == 'a-few', lv)
    check('sync: window A follows', a.locator('.day-a-few').count() >= 1)
    ctx.close()

    # ---- New-milestone line on Check-in
    ctx = b.new_context(viewport={"width": 390, "height": 844}, timezone_id="America/Vancouver")
    pg = ctx.new_page(); pg.clock.install(time=NOW)
    pg.goto(BASE + "/settings"); pg.wait_for_timeout(500)
    seed(pg, "await db.setSetting('milestones_seen', JSON.stringify(['First clear day']));")
    pg.goto(BASE + "/"); pg.reload(); pg.wait_for_timeout(1200)
    line = pg.locator('.ci-milestone')
    newest = pg.evaluate("async () => (await (await import('/src/data/database.ts')).getNewMilestones('2026-09-30'))[0].title")
    check('milestone line shows the newest unseen milestone, by its own title', line.count() == 1 and newest in line.inner_text(), line.inner_text() if line.count() else '')
    check('milestone line links to Milestones', pg.locator('.ci-milestone-link').get_attribute('href') == '#/milestones')
    pg.get_by_role('button', name=f'Dismiss: {newest}').click(); pg.wait_for_timeout(500)
    after = pg.locator('.ci-milestone-link').inner_text() if pg.locator('.ci-milestone').count() else ''
    check('✕ dismisses it; the next one (if any) takes its place', newest not in after, after)
    pg.locator('.ci-milestone-link').click(); pg.wait_for_timeout(800)
    check('tapping the line opens Milestones', '/milestones' in pg.url)
    pg.goto(BASE + "/"); pg.wait_for_timeout(800)
    check('…and it is gone from Check-in', after == '' or after not in (pg.locator('.ci-milestone').inner_text() if pg.locator('.ci-milestone').count() else ''))
    ctx.close()

    # ---- Trends: the selected month compares with the one before
    ctx = b.new_context(viewport={"width": 390, "height": 844}, timezone_id="America/Vancouver")
    pg = ctx.new_page(); pg.clock.install(time=NOW)
    pg.goto(BASE + "/settings"); pg.wait_for_timeout(500)
    seed(pg)
    pg.goto(BASE + "/trends"); pg.reload(); pg.wait_for_timeout(1200)
    chart = pg.locator('[role="slider"]').first
    t1 = pg.locator('.mc-detail').first.inner_text()
    chart.focus(); pg.keyboard.press('ArrowLeft'); pg.wait_for_timeout(200)
    t2 = pg.locator('.mc-detail').first.inner_text()
    check('selected month (latest) compares with the month before', 'September so far' in t1 and 'than August' in t1, t1)
    check('picking August compares August with July', 'August:' in t2 and 'than July' in t2, t2)
    top = pg.locator('.tr-trends').first.inner_text() if pg.locator('.tr-trends').count() else ''
    check('no fixed "this month vs last month" line below the chart', 'so far' not in top, top)
    ctx.close()

    # ---- Backup / Restore
    ctx = b.new_context(viewport={"width": 390, "height": 844}, timezone_id="America/Vancouver")
    pg = ctx.new_page()
    pg.goto(BASE + "/settings"); pg.wait_for_timeout(500)
    seed(pg)
    pg.goto(BASE + "/settings"); pg.reload(); pg.wait_for_timeout(900)
    t = pg.locator('main').inner_text()
    check('Settings: "Back up" and "Restore from a backup"', 'Back up' in t and 'Restore from a backup' in t and 'Export data' not in t and 'Import data' not in t)
    pg.goto(BASE + "/settings/export"); pg.wait_for_timeout(800)
    check('old /settings/export opens Backup', pg.url.endswith('/settings/backup') and pg.locator('h1').inner_text() == 'Back up your data', pg.url)
    pg.goto(BASE + "/settings/import"); pg.wait_for_timeout(800)
    check('old /settings/import opens Restore', pg.url.endswith('/settings/restore') and pg.locator('h1').inner_text() == 'Restore from a backup', pg.url)
    ctx.close()
    b.close()

for ok, n, d in res: print(('PASS ' if ok else 'FAIL ') + n + ('' if ok else f'  <- {d}'))
print(sum(o for o, _, _ in res), '/', len(res), 'passed')
