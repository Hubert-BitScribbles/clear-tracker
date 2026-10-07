# Walkthrough: onboarding from a fresh start, the installed-app variant, and
# the Help / Resources links across screens. Run against `npm run dev` (5173).
import datetime, json, sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173/#"
results = []
def check(name, cond, detail=''): results.append((bool(cond), name, detail))

def fresh(b, installed=False):
    ctx = b.new_context(viewport={"width": 390, "height": 844}, timezone_id="America/Vancouver")
    if installed:  # what an app opened from the Home Screen reports
        ctx.add_init_script("""const m = window.matchMedia.bind(window);
          window.matchMedia = (q) => q.includes('display-mode: standalone') ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : m(q);""")
    pg = ctx.new_page()
    pg.clock.install(time=datetime.datetime(2026, 9, 30, 20, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=-7))))
    pg.errors = []
    pg.on("pageerror", lambda e: pg.errors.append(str(e)))
    return ctx, pg

def button(pg, text): return pg.get_by_role('button', name=text, exact=True)
def dots(pg): return pg.locator('.ob-dot').count()
def h1(pg): return pg.locator('h1').inner_text()

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---- A browser tab, first open
    ctx, pg = fresh(b)
    pg.goto(BASE + "/"); pg.wait_for_timeout(1200)
    check('first open goes to onboarding', pg.url.endswith('#/onboarding'), pg.url)
    check('browser tab: 7 steps, no tab bar', dots(pg) == 7 and pg.locator('.tabbar, nav.tab-bar, .tab').count() == 0)
    check('welcome: says what it is and isn\'t; no Back', "What it isn't" in pg.locator('main').inner_text()
          and 'medical service' in pg.locator('main').inner_text() and button(pg, '‹ Back').count() == 0)
    button(pg, 'Get started').click(); pg.wait_for_timeout(200)
    check('install step next, with Back', h1(pg) == 'Add it to your Home Screen first' and button(pg, '‹ Back').count() == 1)
    button(pg, '‹ Back').click(); pg.wait_for_timeout(200)
    check('Back returns to welcome', h1(pg) == 'Welcome to Clear Tracker')
    button(pg, 'Get started').click(); pg.wait_for_timeout(150)
    button(pg, 'Continue in the browser').click(); pg.wait_for_timeout(200)
    t = pg.locator('main').inner_text()
    check('privacy: three points, "in this browser", backup advice', h1(pg) == 'Your record stays on this device'
          and pg.locator('.ob-points li').count() == 3 and 'in this browser' in t and '30 days' in t)
    check('privacy: restore link to Import', pg.get_by_role('link', name='Import it').get_attribute('href') == '#/settings/import')
    button(pg, 'Continue').click(); pg.wait_for_timeout(200)

    check('logging step', h1(pg) == 'Logging a day')
    sounds = []
    pg.expose_function('ctSound', lambda lv: sounds.append(lv))
    pg.evaluate("window.addEventListener('ct:sound', e => window.ctSound(e.detail))")
    cell = pg.locator('.ob-practice .day-cell')
    month = pg.locator('.ob-practice-month').inner_text()
    check('practice day shows its month and year (not just a number)', bool(__import__('re').fullmatch(r'[A-Z][a-z]{2} \d{4}', month)), month)
    check('practice day invites a tap before the first try', pg.locator('.ob-practice-level').inner_text() == 'Tap the day to try it')
    seen, marks = [], []
    for _ in range(5):
        cell.click(); pg.wait_for_timeout(120)
        seen.append(pg.locator('.ob-practice-level').inner_text())
        marks.append((pg.locator('.ob-practice .mark-dot').count(), pg.locator('.ob-practice .mark-tick').count()))
    check('practice day cycles Clear → A few → Moderate → A lot → not logged', seen ==
          ['Clear — no drinks', 'A few — 1–2 drinks', 'Moderate — 3–4 drinks', 'A lot — 5 or more', 'Not logged'], seen)
    check('practice cell shows the same marks as Check-in (dot; 1, 2, 3 ticks)', marks == [(1, 0), (0, 1), (0, 2), (0, 3), (0, 0)], marks)
    check('a tone for each logged level', sounds == ['clear', 'a-few', 'moderate', 'a-lot'], sounds)
    check('practice cell is a labelled button', 'Practice day: not logged' in (cell.get_attribute('aria-label') or ''))
    pg.get_by_role('switch', name='Sounds').click(); pg.wait_for_timeout(100)
    sounds.clear(); cell.click(); pg.wait_for_timeout(150)
    check('Sounds off: practice is silent', sounds == [], sounds)
    n = pg.evaluate("async () => (await import('/src/data/database.ts')).getEntryCount()")
    check('practice day is not saved', n == 0, n)
    button(pg, 'Continue').click(); pg.wait_for_timeout(200)

    check('intention step', h1(pg) == 'Set your first intention')
    slider = pg.get_by_role('slider', name='Clear days per week')
    slider.focus(); pg.keyboard.press('ArrowRight'); pg.keyboard.press('ArrowRight')
    check('intention set to 5 from the keyboard', pg.locator('.ob-big').inner_text() == '5')
    button(pg, 'Continue').click(); pg.wait_for_timeout(200)

    check('region step', h1(pg) == 'Where are you?')
    sel = pg.locator('.ob-card select')
    check('region guessed from time zone: Canada, British Columbia', sel.nth(0).input_value() == 'ca' and sel.nth(1).input_value() == 'ca_bc')
    sel.nth(1).select_option('ca_on'); pg.wait_for_timeout(100)
    button(pg, 'Continue').click(); pg.wait_for_timeout(200)

    t = pg.locator('main').inner_text()
    check('ready: intention and region summarised, support explained', h1(pg) == "You're ready"
          and 'Aiming for 5 clear days a week' in t and 'Canada · Ontario' in t and 'bottom of Check-in' in t, t[:300])
    pg.get_by_role('button', name='Start tracking').click(); pg.wait_for_timeout(1200)
    check('Start tracking opens Check-in', pg.url.endswith('#/') and pg.locator('h1').inner_text() == 'Check-in', pg.url)
    saved = pg.evaluate("""async () => { const db = await import('/src/data/database.ts');
      return { region: await db.getSetting('region',''), audio: await db.getSetting('audio_cues_enabled',''),
               done: await db.getSetting('onboarding_complete',''), hist: await db.getIntentionHistory() }; }""")
    check('saved: region, sounds off, onboarding done, intention 5 from this Monday',
          json.loads(saved['region']) == {'country': 'ca', 'province': 'ca_on'} and saved['audio'] == 'false' and saved['done'] == 'true'
          and saved['hist'][0]['weekly_target'] == 5 and saved['hist'][0]['effective_date'] == '2026-09-28', saved)

    # ---- Check-in links
    links = pg.get_by_role('navigation', name='Help and resources').get_by_role('link').evaluate_all("els => els.map(e => [e.textContent, e.getAttribute('href')])")
    check('Check-in: "How logging works" and "Support resources"', links == [['How logging works', '#/settings/help?topic=start'],
          ['Support resources', '#/settings/resources']], links)
    pg.get_by_role('link', name='How logging works').click(); pg.wait_for_timeout(900)
    check('…opens the Logging article', pg.locator('#help-start').get_attribute('open') is not None)
    pg.goto(BASE + '/'); pg.wait_for_timeout(800)
    pg.get_by_role('link', name='Support resources').click(); pg.wait_for_timeout(900)
    check('…Resources follow the region chosen in onboarding', 'For Canada · Ontario.' in pg.locator('.sp-lede').inner_text()
          and pg.get_by_text('ConnexOntario').count() == 1)
    check('no page errors (browser tab)', not pg.errors, pg.errors)
    ctx.close()

    # ---- Installed app: no install step; restore path
    ctx, pg = fresh(b, installed=True)
    pg.goto(BASE + "/onboarding"); pg.wait_for_timeout(1000)
    check('installed app: 6 steps, no install step', dots(pg) == 6)
    button(pg, 'Get started').click(); pg.wait_for_timeout(200)
    check('installed app: privacy follows welcome, without "in this browser"', h1(pg) == 'Your record stays on this device'
          and 'in this browser' not in pg.locator('main').inner_text())
    pg.get_by_role('link', name='Import it').click(); pg.wait_for_timeout(900)
    check('"Import it" opens Import', h1(pg) == 'Import a backup')
    check('no page errors (installed)', not pg.errors, pg.errors)
    ctx.close()

    # ---- Help links on other screens (with test data)
    ctx, pg = fresh(b)
    pg.goto(BASE + "/settings"); pg.wait_for_timeout(500)
    pg.evaluate("""async () => { const db = await import('/src/data/database.ts'); const h = await import('/test/helpers.ts');
      const s = h.scenario(42, '2026-09-30', {}); await db.restoreFromBackup(s.entries, s.intentions); await db.setSetting('onboarding_complete', 'true'); }""")
    expect = {
        '/intention': ('How intentions work', 'intention'),
        '/milestones': ('How milestones work', 'milestones'),
        '/milestones/challenges': ('How challenges work', 'milestones'),
        '/trends': ('About Trends and reports', 'trends'),
        '/trends/review?year=2026&month=8': ('About reports', 'trends'),
        '/settings/export': ('About backups and passphrases', 'backups'),
        '/settings/import': ('About backups', 'backups'),
    }
    for path, (text, topic) in expect.items():
        pg.goto(BASE + path); pg.reload(); pg.wait_for_timeout(900)
        href = pg.get_by_role('link', name=text, exact=True).get_attribute('href')
        check(f'{path}: "{text}"', href == f'#/settings/help?topic={topic}', href)
    pg.goto(BASE + '/settings'); pg.wait_for_timeout(800)
    check('Settings: Region says what it decides, linking Resources',
          pg.locator('#region + section').get_by_role('link', name='Resources').get_attribute('href') == '#/settings/resources')
    # Once set up, onboarding steps aside: the installed app can open on the
    # tab's address, and going through again re-saves this week's intention.
    pg.goto(BASE + '/onboarding'); pg.reload(); pg.wait_for_timeout(1200)
    check('onboarding, when already set up, goes to Check-in', '/onboarding' not in pg.url and pg.locator('.onboarding').count() == 0, pg.url)
    # Contact: both buttons readable (text a different colour from the button).
    pg.goto(BASE + '/settings/help?topic=contact'); pg.reload(); pg.wait_for_timeout(900)
    cols = [pg.locator(sel).first.evaluate("e => { const c = getComputedStyle(e); return [e.textContent.trim(), c.color, c.backgroundColor]; }")
            for sel in ('.sp-action-strong', '.sp-action:not(.sp-action-strong)')]
    check('Contact: "Send feedback" and "Report a problem" have visible text', [c[0] for c in cols] == ['Send feedback', 'Report a problem']
          and all(c[1] != c[2] for c in cols), cols)
    body = pg.locator('#help-contact').inner_text()
    check('Contact: asks for no health or personal details', "Please don't include health details or anything personal" in body)
    check('no page errors (screens)', not pg.errors, pg.errors)
    ctx.close()
    b.close()

for ok, name, detail in results:
    print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else f'  <- {detail}'))
print(sum(ok for ok, _, _ in results), '/', len(results), 'passed')
