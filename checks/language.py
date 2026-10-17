# The Language setting: following the device, choosing a language, and what
# changes with it. Run against the dev server (port 5173).
import datetime
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173/#"
NOW = datetime.datetime(2026, 9, 30, 20, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=-7)))
results = []
def check(name, ok, detail=''):
    results.append(ok); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else f'  [{detail}]'))

def fresh(b, locale, tz='America/Vancouver'):
    ctx = b.new_context(viewport={"width": 390, "height": 844}, timezone_id=tz, locale=locale)
    pg = ctx.new_page(); pg.clock.install(time=NOW)
    errors = []; pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE + "/settings"); pg.wait_for_timeout(600)
    pg.evaluate("""async () => { const db = await import('/src/data/database.ts'); const h = await import('/test/helpers.ts');
      const s = h.scenario(42, '2026-09-30', {}); await db.restoreFromBackup(s.entries, s.intentions); await db.setSetting('onboarding_complete', 'true'); }""")
    return ctx, pg, errors

with sync_playwright() as p:
    b = p.chromium.launch()
    # An English device: English until German is chosen.
    ctx, pg, errors = fresh(b, 'en-CA')
    pg.goto(BASE + "/settings"); pg.reload(); pg.wait_for_timeout(900)
    check('English device: Settings in English', pg.locator('h1').inner_text() == 'Settings')
    sel = pg.locator('#language + section select')
    check('Language: Automatic (English) chosen', sel.input_value() == 'auto' and 'Automatic (English)' in sel.inner_text(), sel.inner_text())
    with pg.expect_navigation(): sel.select_option('de')
    pg.wait_for_timeout(900)
    check('choosing Deutsch reloads in German', pg.locator('h1').inner_text() == 'Einstellungen', pg.locator('h1').inner_text())
    check('page language is German', pg.evaluate("document.documentElement.lang") == 'de-DE', pg.evaluate("document.documentElement.lang"))
    pg.goto(BASE + "/"); pg.wait_for_timeout(900)
    check('Check-in in German', pg.locator('h1').inner_text() == 'Check-in' and 'Alkoholfreie Tage im September' in pg.inner_text('main'), pg.inner_text('main')[:200])
    pg.goto(BASE + "/settings/help"); pg.wait_for_timeout(900)
    check('Help says it is English for now, and marks it', 'nur auf Englisch' in pg.inner_text('main') and pg.locator('.sp-articles').get_attribute('lang') == 'en')
    pg.goto(BASE + "/settings"); pg.wait_for_timeout(900)
    with pg.expect_navigation(): pg.locator('#language + section select').select_option('en')
    pg.wait_for_timeout(900)
    check('back to English', pg.locator('h1').inner_text() == 'Settings' and pg.evaluate("document.documentElement.lang") == 'en')
    check('no page errors (English device)', not errors, errors[:2])
    ctx.close()

    # A German-language device in Vienna: German straight away, Austrian dates.
    ctx, pg, errors = fresh(b, 'de-AT', 'Europe/Vienna')
    pg.evaluate("async () => (await import('/src/data/database.ts')).setSetting('region', JSON.stringify({country: 'at', province: 'ca_ab'}))")
    pg.goto(BASE + "/milestones/challenges"); pg.reload(); pg.wait_for_timeout(900)
    check('German device: German without choosing', pg.locator('h1').inner_text() == 'Herausforderungen', pg.locator('h1').inner_text())
    check('Austria: page language de-AT', pg.evaluate("document.documentElement.lang") == 'de-AT')
    pg.evaluate("async () => (await import('/src/data/database.ts')).setChallenges({weekendRuns: [], weekRuns: [], months: ['2027-01']})")
    pg.reload(); pg.wait_for_timeout(900)
    check('Austria: January is "Jänner"', 'Jänner' in pg.inner_text('main'), pg.inner_text('main')[-300:])
    pg.goto(BASE + "/settings"); pg.wait_for_timeout(900)
    sel = pg.locator('#language + section select')
    check('Language: Automatisch (Deutsch)', 'Automatisch (Deutsch)' in sel.inner_text(), sel.inner_text())
    check('no page errors (German device)', not errors, errors[:2])
    ctx.close()
    b.close()
print(f'{sum(results)} / {len(results)} passed')
