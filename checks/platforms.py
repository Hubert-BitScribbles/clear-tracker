# Device wording: onboarding, reminder, About, Help, report on iPhone, Android and a computer.
# Run against `npm run dev` (5173).
import datetime
from playwright.sync_api import sync_playwright
UA={'ios':"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    'android':"Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
    'other':None}
res=[]
def check(n,c,d=''): res.append((bool(c),n,d))
with sync_playwright() as p:
    b=p.chromium.launch()
    for plat,ua in UA.items():
        kw={'viewport':{"width":390,"height":844},'timezone_id':"America/Vancouver"}
        if ua: kw['user_agent']=ua
        ctx=b.new_context(**kw); pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.goto("http://localhost:5173/#/onboarding"); pg.wait_for_timeout(900)
        t=pg.locator('main').inner_text()
        check(f'{plat} welcome: "already on your Home Screen? … search" only on iPhone',
              ('Already added Clear Tracker to your Home Screen' in t and 'search for' in t) == (plat=='ios'), t[-300:])
        pg.get_by_role('button',name='Get started').click(); pg.wait_for_timeout(200)
        t=pg.locator('main').inner_text()
        if plat=='ios': check('ios onboarding: Share steps, data won\'t move', 'Add to Home Screen' in t and "won't move across" in t)
        if plat=='android': check('android onboarding: ⋮ → Install app, days come with you', 'Install app' in t and 'days come with you' in t and "won't move" not in t, t[-300:])
        if plat=='other': check('computer (Chrome) onboarding: install as an app, same record, days come with you', 'Install it as an app' in t and 'share one record' in t and 'days come with you' in t, t[-400:])
        for k in range(2): pg.get_by_role('button',name='Continue' if k else 'Continue in the browser',exact=True).click(); pg.wait_for_timeout(150)
        t=pg.locator('main').inner_text()
        check(f'{plat} onboarding sounds line', {'ios':'silent switch' in t,'android':'media volume' in t,'other':'silent switch' not in t and 'media volume' not in t}[plat])
        pg.evaluate("""async () => { const db = await import('/src/data/database.ts'); const h = await import('/test/helpers.ts');
          const s=h.scenario(42,'2026-09-30',{}); await db.restoreFromBackup(s.entries, s.intentions); await db.setSetting('onboarding_complete','true'); }""")
        pg.goto("http://localhost:5173/#/settings"); pg.reload(); pg.wait_for_timeout(900)
        t=pg.locator('main').inner_text()
        check(f'{plat} reminder steps', {'ios':'In Reminders' in t and 'open Clear Tracker from your Home Screen' in t and 'Copy link' not in t,
                                         'android':'Google Calendar' in t and 'description' in t and 'Copy link' in t,
                                         'other':'In your calendar' in t and 'Copy link' in t}[plat], t[t.find('Reminder'):][:500])
        pg.goto("http://localhost:5173/#/settings/about"); pg.wait_for_timeout(900)
        t=pg.locator('main').inner_text()
        check(f'{plat} About storage', ('seven days' in t) == (plat=='ios') and (('low on space' in t) == (plat!='ios')))
        pg.goto("http://localhost:5173/#/settings/help?topic=install"); pg.reload(); pg.wait_for_timeout(900)
        t=pg.locator('#help-install').inner_text()
        check(f'{plat} Help install: this device first, then others; right record note', 'Other devices' in t and {
              'ios':'Add to Home Screen' in t and 'own record' in t and 'search for' in t,
              'android':'Install app' in t and 'share one record' in t,
              'other':'Install' in t and 'share one record' in t and 'own record' not in t.split('Other devices')[0]}[plat], t)
        pg.evaluate("document.querySelectorAll('details').forEach(d=>d.open=true)")
        t=pg.locator('.sp-articles').inner_text()
        check(f'{plat} Help backups/sounds/trouble/PDF', {
          'ios': 'iCloud Drive' in t and 'silent switch' in t and 'separate records' in t and 'tap Share in the print preview' in t,
          'android': 'Google Drive' in t and 'media volume' in t and 'separate records' not in t and "Chrome’s storage" in t and 'Save as PDF as the printer' in t and 'iCloud' not in t,
          'other': 'puts it in Downloads' in t and 'silent switch' not in t and 'separate records' not in t}[plat], t[:0])
        pg.goto("http://localhost:5173/#/trends/review?year=2026&month=8"); pg.reload(); pg.wait_for_timeout(1200)
        t=pg.locator('.rv-share').inner_text()
        check(f'{plat} report PDF hint', {'ios':'On iPhone' in t,'android':'On Android' in t,'other':'On iPhone' not in t and 'On Android' not in t}[plat], t)
        check(f'{plat} no page errors', not errs, errs)
        ctx.close()
    b.close()
for ok,n,d in res: print(('PASS ' if ok else 'FAIL ')+n+('' if ok else f'  <- {d}'))
print(sum(o for o,_,_ in res),'/',len(res),'passed')
