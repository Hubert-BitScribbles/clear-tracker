import datetime, json, sys
from collections import defaultdict
from playwright.sync_api import sync_playwright
AXE=open(__import__('os').path.join(__import__('os').path.dirname(__file__), '..', 'node_modules', 'axe-core', 'axe.min.js')).read()
MODES=[('light',False),('dark',False),('light',True),('dark',True)]
# Onboarding: press the forward buttons in order (a browser tab has the install step).
OB_FORWARD=['Get started','Continue in the browser','Continue','Continue','Continue','Continue']
def ob(n, extra=''):
    seq=json.dumps(OB_FORWARD[:n])
    return ("(async () => { for (const t of "+seq+") { await new Promise(r => setTimeout(r, 80)); "
            "[...document.querySelectorAll('button')].find(b => b.textContent.trim() === t).click(); } "
            "await new Promise(r => setTimeout(r, 80)); "+extra+" })()")
# (name, path, optional setup js run on the page before scanning)
STATES=[
 ('Onboarding: welcome','/onboarding',None),
 ('Onboarding: install','/onboarding',ob(1)),
 ('Onboarding: privacy','/onboarding',ob(2)),
 ('Onboarding: logging a day','/onboarding',ob(3,"document.querySelector('.ob-practice .day-cell').click(); document.querySelector('.ob-practice .day-cell').click();")),
 ('Onboarding: intention','/onboarding',ob(4)),
 ('Onboarding: region','/onboarding',ob(5)),
 ('Onboarding: ready','/onboarding',ob(6)),
 ('Check-in','/',None),
 ('Trends','/trends',"document.querySelectorAll('.tr-dow-row')[4].click(); document.querySelectorAll('.wg-tile')[10].click();"),
 ('Month in review','/trends/review?year=2026&month=8',"document.querySelector('.rv-include summary').click()"),
 ('Year in review','/trends/review?year=2026',None),
 ('Milestones','/milestones',None),
 ('All milestones','/milestones/all',None),
 ('Challenges','/milestones/challenges',None),
 ('Settings','/settings',None),
 ('Settings: savings form','/settings',"[...document.querySelectorAll('.st-link')].find(b=>b.textContent.includes('Change')).click()"),
 ('Settings: erase dialog','/settings',"[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Erase all data')).click()"),
 ('About','/settings/about',None),
 ('Help','/settings/help?topic=contact',None),
 ('Help: sounds','/settings/help?topic=sounds',None),
 ('Resources','/settings/resources',None),
 ('Intention','/intention',None),
 ('Backup: passphrase','/settings/backup',"[...document.querySelectorAll('button')].find(b=>b.textContent==='Continue').click()"),
 ('Restore','/settings/restore',None),
]
only=sys.argv[1:]  # optional filter
found=defaultdict(lambda: {'impact':'', 'help':'', 'where':set(), 'nodes':[]})
with sync_playwright() as p:
    b=p.chromium.launch()
    for t,hc in MODES:
        mode=f"{t}{' HC' if hc else ''}"
        ctx=b.new_context(viewport={"width":390,"height":844}, timezone_id="America/Vancouver"); pg=ctx.new_page()
        pg.clock.install(time=datetime.datetime(2026,9,30,20,0,tzinfo=datetime.timezone(datetime.timedelta(hours=-7))))
        pg.goto("http://localhost:5173/#/settings"); pg.wait_for_timeout(400)
        pg.evaluate(f"""async () => {{ localStorage.setItem('ct-appearance', JSON.stringify({{theme:'{t}',highContrast:{str(hc).lower()}}}));
          const db = await import('/src/data/database.ts'); const h = await import('/test/helpers.ts');
          const s=h.scenario(42,'2026-09-30',{{}}); await db.restoreFromBackup(s.entries, s.intentions); await db.setSetting('onboarding_complete','true');
          await db.setSetting('savings_baseline_per_week','14'); await db.setSetting('savings_price_per_drink','9');
          await db.setChallenges({{weekendRuns:[{{from:'2026-06-05'}}],weekRuns:[],months:['2026-09','2026-12']}}); }}""")
        for name,path,setup in STATES:
            if only and not any(o.lower() in name.lower() for o in only): continue
            # Onboarding steps aside once set up, so show it as not yet done.
            pg.evaluate(f"async () => (await import('/src/data/database.ts')).setSetting('onboarding_complete', '{'false' if path == '/onboarding' else 'true'}')")
            pg.goto("http://localhost:5173/#"+path); pg.reload(); pg.wait_for_timeout(900)
            if setup: pg.evaluate(setup); pg.wait_for_timeout(500)
            pg.add_script_tag(content=AXE)
            res=pg.evaluate("""async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'] } });
              return r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map(n => ({ t: n.target.join(' '), s: n.failureSummary.split('\\n').slice(1,2).join(' ') })) })); }""")
            for v in res:
                f=found[v['id']]; f['impact']=v['impact']; f['help']=v['help']; f['where'].add(f"{name} [{mode}]")
                for n in v['nodes'][:3]:
                    if len(f['nodes'])<6 and n['t'] not in [x[0] for x in f['nodes']]: f['nodes'].append((n['t'], n['s'][:150]))
        ctx.close()
    b.close()
if not found: print('NO VIOLATIONS'); sys.exit()
for k,v in sorted(found.items(), key=lambda kv: ['critical','serious','moderate','minor'].index(kv[1]['impact'] or 'minor')):
    screens=sorted({w.split(' [')[0] for w in v['where']}); modes=sorted({w.split('[')[1][:-1] for w in v['where']})
    print(f"\n[{v['impact']}] {k}: {v['help']}\n  screens: {', '.join(screens)}\n  modes: {', '.join(modes)}")
    for t,s in v['nodes']: print(f"   - {t}  {s}")
