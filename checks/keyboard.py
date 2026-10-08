import datetime
from playwright.sync_api import sync_playwright
SCREENS=['/','/trends','/trends/review?year=2026&month=8','/milestones','/milestones/all','/milestones/challenges','/settings','/settings/about','/settings/help','/settings/resources','/intention','/settings/backup','/settings/restore','/onboarding']
results=[]
def check(name, cond, detail=''): results.append((bool(cond), name, detail))
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":844}, timezone_id="America/Vancouver"); pg=ctx.new_page()
    pg.clock.install(time=datetime.datetime(2026,9,30,20,0,tzinfo=datetime.timezone(datetime.timedelta(hours=-7))))
    pg.goto("http://localhost:5173/#/settings"); pg.wait_for_timeout(400)
    pg.evaluate("""async () => { const db = await import('/src/data/database.ts'); const h = await import('/test/helpers.ts');
      const s=h.scenario(42,'2026-09-30',{}); await db.restoreFromBackup(s.entries, s.intentions); await db.setSetting('onboarding_complete','true');
      await db.setChallenges({weekendRuns:[{from:'2026-06-05'}],weekRuns:[],months:['2026-12']}); }""")
    for path in SCREENS:
        pg.goto("http://localhost:5173/#"+path); pg.reload(); pg.wait_for_timeout(900)
        h1=pg.locator('h1').count()
        # Tab through everything; record each stop and whether focus is visibly marked
        pg.evaluate("document.activeElement && document.activeElement.blur()")
        stops=[]; invisible=[]
        pg.evaluate("document.querySelectorAll('[data-kb]').forEach(e => e.removeAttribute('data-kb'))")
        for n in range(200):
            pg.keyboard.press('Tab')
            info=pg.evaluate("""(n) => { const e = document.activeElement; if (!e || e === document.body) return null;
              if (e.dataset.kb) return { seen: true };
              e.dataset.kb = String(n);
              const ring = (x) => { const s = getComputedStyle(x); return (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none'; };
              // Focus may be drawn on the element itself or, for calendar days, on its inner tile.
              const inner = e.querySelector('.day-inner');
              const vis = ring(e) || (inner && ring(inner));
              return { id: e.tagName + '.' + (e.className || '').toString().split(' ')[0] + ':' + (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 24), vis }; }""", n)
            if not info or info.get('seen'): break
            stops.append(info['id'])
            if not info['vis']: invisible.append(info['id'])
        # Controls that should be reachable: visible, not inside a closed <details>, and for a
        # radio group only its chosen option (Tab enters a group once; arrows move within it), and
        # likewise one cell of a grid.
        interactive=pg.evaluate("""() => [...document.querySelectorAll('a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select, summary, [tabindex="0"]')]
          .filter(e => e.offsetParent !== null && !e.closest('[hidden]'))
          // Hidden inside any closed <details> (a summary only counts its own details' parents).
          .filter(e => !(e.tagName === 'SUMMARY' ? e.parentElement.parentElement?.closest('details:not([open])') : e.closest('details:not([open])')))
          .filter(e => !(e.type === 'radio' && !e.checked && document.querySelector(`input[type=radio][name="${e.name}"]:checked`)))
          // Roving focus (the Trends week grid): one Tab stop, arrow keys inside, so tabindex=-1 cells aren't stops.
          .filter(e => !(e.closest('[role=grid]') && e.getAttribute('tabindex') === '-1')).length""")
        pg.set_viewport_size({"width":320,"height":700}); pg.wait_for_timeout(300)
        overflow=pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        pg.set_viewport_size({"width":390,"height":844})
        check(f'{path}: one h1', h1==1, h1)
        check(f'{path}: Tab reaches all {interactive} controls ({len(stops)} stops)', len(stops)>=interactive, (len(stops), interactive))
        check(f'{path}: focus visibly marked on every stop', not invisible, invisible[:4])
        check(f'{path}: no sideways scrolling at 320px', overflow<=0, overflow)
    # Report: the closed section opens from the keyboard and its boxes become reachable
    pg.goto("http://localhost:5173/#/trends/review?year=2026&month=8"); pg.wait_for_timeout(900)
    pg.locator('.rv-include summary').focus(); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    pg.keyboard.press('Tab'); first=pg.evaluate("document.activeElement.type")
    pg.keyboard.press('Space'); pg.wait_for_timeout(300)
    check('report: "Choose what\'s included" opens with Enter; Tab reaches a box; Space toggles it', first=='checkbox' and pg.evaluate("!document.activeElement.checked"), first)
    pg.keyboard.press('Space')
    # Settings: arrow keys move within the savings radio group
    pg.goto("http://localhost:5173/#/settings"); pg.wait_for_timeout(800)
    pg.get_by_role('radio', name='A number I enter (before tracking)').focus(); pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(200)
    check('savings options: arrow key moves to "Measured from my first 3 months"', pg.get_by_role('radio', name=__import__('re').compile('Measured from my first 3 months')).is_checked())
    # Dialog: focus in, Escape out, focus returns
    pg.goto("http://localhost:5173/#/settings"); pg.wait_for_timeout(800)
    erase=pg.get_by_role('button', name='Erase all data'); erase.focus(); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
    inside=pg.evaluate("!!document.activeElement.closest('dialog')")
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    back=pg.evaluate("document.activeElement.textContent.trim()")
    check('erase dialog: focus moves in, Escape closes, focus returns to Erase', inside and back=='Erase all data', (inside, back))
    # Intention chart: keyboard
    pg.goto("http://localhost:5173/#/trends"); pg.wait_for_timeout(900)
    tabbable=pg.locator('[role=grid] button[tabindex="0"]')
    one_stop=tabbable.count()==1
    tabbable.focus()
    lab=lambda: pg.evaluate("document.activeElement.getAttribute('aria-label') || ''")
    wk=lambda: pg.evaluate("document.activeElement.dataset.week || ''")
    v0=wk(); pg.keyboard.press('ArrowLeft'); pg.wait_for_timeout(200); v1=wk()
    pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(200); v2=wk()
    pg.keyboard.press('Home'); pg.wait_for_timeout(200); v3=wk(); l3=lab()
    check('Week grid: one Tab stop; arrows move by week and month; Home to the first; announced as text',
          one_stop and v1 < v0 and v2 < v1 and v3 <= v2 and l3.startswith('Week of') and pg.locator('[role=grid] button[tabindex="0"]').get_attribute('data-week')==v3,
          (one_stop, v0, v1, v2, v3, l3))
    # Check-in: is a tap announced?
    pg.goto("http://localhost:5173/#/"); pg.wait_for_timeout(900)
    live=pg.evaluate("[...document.querySelectorAll('[aria-live],[role=status]')].map(e=>e.className+':'+e.textContent.trim().slice(0,60))")
    check('Check-in: a live region exists for announcing a logged day', bool(live), live)
    b.close()
for ok,name,detail in results: print(('PASS ' if ok else 'FAIL ')+name+('' if ok else f'  <- {detail}'))
print(sum(ok for ok,_,_ in results),'/',len(results),'passed')
