# Device paths (rc.4): detection, the "Not right? Change" override, and the
# guidance each path gets — welcome hint, install step, reminders, Help, About.
# Run against `npm run dev` (5173).
import datetime
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173/#"
UA = {
    'iPhone · Safari': "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
    'iPhone · Safari 27': "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1",
    'iPhone · Safari 26': "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1",
    'iPhone · Chrome': "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.7339.122 Mobile/15E148 Safari/604.1",
    'Mac · Safari': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15",
    'Mac · Chrome': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    'Mac · Firefox': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:143.0) Gecko/20100101 Firefox/143.0",
    'Android · Samsung Internet': "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36",
}
# What each path should say: (welcome phrase, install heading, install must include, reminder has link, Help/About must include)
EXPECT = {
    'iPhone · Safari': ('an iPhone, in Safari', 'Add it to your Home Screen first', 'separate from Safari', False, 'Home Screen app'),
    'iPhone · Safari 27': ('an iPhone, in Safari', 'Add it to your Home Screen first', '≡ at the left of the address bar', False, 'Home Screen app'),
    'iPhone · Safari 26': ('an iPhone, in Safari', 'Add it to your Home Screen first', '⋯ next to the address bar', False, 'Home Screen app'),
    'iPhone · Chrome': ('an iPhone, in Chrome', 'Add it to your Home Screen first', 'in the address bar', False, 'Home Screen app'),
    'Mac · Safari': ('a Mac, in Safari', 'Add it to your Dock first', 'File → Add to Dock', False, 'Dock app'),
    'Mac · Chrome': ('a Mac, in Chrome', 'Install it as an app', 'share one record', True, 'share one record'),
    'Mac · Firefox': ('a Mac, in Firefox', 'Keep it handy', 'Bookmark this page', False, 'stay in Firefox'),
    'Android · Samsung Internet': ('an Android device, in Samsung Internet', 'Add it to your Home Screen first', 'Add page to', True, 'share one record'),
}
# iPhone install steps, in order (1.4.3: Safari's menu follows its version; Chrome's Share is in the address bar).
STEPS = {
    'iPhone · Safari 27': ['≡ at the left of the address bar', 'View More', 'Keep Open as Web App on', 'from your Home Screen'],
    'iPhone · Chrome': ['Share (□↑) in the address bar', 'View More', 'below Print', 'Keep Open as Web App on', 'from your Home Screen'],
    'iPhone · Safari 26': ['⋯ next to the address bar', 'Add to Home Screen', 'from your Home Screen'],
    'iPhone · Safari': ['⋯ next to the address bar', 'If Share is already in the toolbar', 'Add to Home Screen'],
}
NOT_SAID = {'iPhone · Safari 27': ['⋯'], 'iPhone · Safari 26': ['≡', 'View More'], 'iPhone · Chrome': ['at the right', '≡', '⋯']}
res = []
def check(n, c, d=''): res.append((bool(c), n, d))

with sync_playwright() as p:
    b = p.chromium.launch()
    for name, ua in UA.items():
        welcome, heading, inst, link, helpword = EXPECT[name]
        ctx = b.new_context(viewport={"width": 390, "height": 844}, timezone_id="America/Vancouver", user_agent=ua)
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.clock.install(time=datetime.datetime(2026, 9, 30, 20, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=-7))))
        pg.goto(BASE + "/onboarding"); pg.wait_for_timeout(900)
        t = pg.locator('main').inner_text()
        check(f'{name}: welcome says "{welcome}"', welcome in t, t[-500:])
        check(f'{name}: one-device line', 'use Clear Tracker on one device' in t)
        own = name.startswith('iPhone') or name == 'Mac · Safari'
        check(f'{name}: "Already added?" hint {"shown" if own else "not shown"}', ('Already added Clear Tracker' in t) == own)
        pg.get_by_role('button', name='Get started').click(); pg.wait_for_timeout(200)
        t = pg.locator('main').inner_text()
        check(f'{name}: install step "{heading}"', pg.locator('h1').inner_text() == heading, pg.locator('h1').inner_text())
        check(f'{name}: install step mentions "{inst}"', inst in t, t)
        if name in STEPS:
            pos = [t.find(w) for w in STEPS[name]]
            check(f'{name}: install steps in order {STEPS[name]}', all(x >= 0 for x in pos) and pos == sorted(pos), pos)
            if name == 'iPhone · Safari 27' or name == 'iPhone · Chrome':
                check(f'{name}: four numbered steps', pg.locator('.ob-steps > li').count() == 4)
        for w in NOT_SAID.get(name, []):
            check(f'{name}: install step doesn\'t say "{w}"', w not in pg.locator('.ob-steps').inner_text())
        if own:
            check(f'{name}: later install won\'t carry days across', "won't move across" in t)
        # Settings: reminder link only where links open the app; device row shown
        pg.evaluate("""async () => { const db = await import('/src/data/database.ts'); await db.setSetting('onboarding_complete','true'); }""")
        pg.goto(BASE + "/settings"); pg.reload(); pg.wait_for_timeout(900)
        t = pg.locator('main').inner_text()
        check(f'{name}: reminder {"with" if link else "without"} a link', (pg.get_by_role('button', name='Copy link').count() == 1) == link)
        check(f'{name}: Settings shows this device', 'this device' in t.lower() and welcome in t, t[:300])
        pg.goto(BASE + "/settings/help?topic=install"); pg.reload(); pg.wait_for_timeout(900)
        t = pg.locator('#help-install').inner_text()
        check(f'{name}: Help install mentions "{helpword}"', helpword in t or (helpword == 'Home Screen app' and 'Home Screen app' in t), t[:600])
        check(f'{name}: no page errors', not errs, errs)
        ctx.close()

    # The override: an iPhone detected as Safari, corrected to Chrome, and back.
    ctx = b.new_context(viewport={"width": 390, "height": 844}, user_agent=UA['iPhone · Safari'])
    pg = ctx.new_page()
    pg.goto(BASE + "/onboarding"); pg.wait_for_timeout(900)
    pg.get_by_role('button', name='Not right? Change device and browser').click(); pg.wait_for_timeout(100)
    pg.get_by_label('Browser').select_option('chrome'); pg.wait_for_timeout(150)
    check('override: welcome follows the choice', 'an iPhone, in Chrome' in pg.locator('main').inner_text())
    pg.get_by_label('Device').select_option('mac'); pg.wait_for_timeout(150)
    check('override: changing the device keeps a browser that exists there', 'a Mac, in Chrome' in pg.locator('main').inner_text())
    pg.reload(); pg.wait_for_timeout(900)
    check('override: remembered on this device', 'a Mac, in Chrome' in pg.locator('main').inner_text())
    pg.get_by_role('button', name='Not right? Change device and browser').click(); pg.wait_for_timeout(100)
    pg.get_by_role('button', name='Go back to what was detected').click(); pg.wait_for_timeout(150)
    check('override: back to detected', 'an iPhone, in Safari' in pg.locator('main').inner_text())
    rep = pg.evaluate("async () => (await import('/src/lib/support.ts')).diagnostics()")
    check('problem report names the device', 'Device: iPhone · Safari (detected)' in rep, rep)
    ctx.close()
    b.close()

for ok, n, d in res: print(('PASS ' if ok else 'FAIL ') + n + ('' if ok else f'  <- {d}'))
print(sum(o for o, _, _ in res), '/', len(res), 'passed')
