# Screenshots of every screen, for proving a change altered nothing visible.
#   python3 checks/snapshots.py <out-dir>              take screenshots (dev server on 5173, or SNAP_URL)
#   SNAP_LANG=de python3 checks/snapshots.py <out-dir>  the same in German (onboarding buttons found by position)
#   python3 checks/snapshots.py --compare <dirA> <dirB>  report screens whose pixels differ
# Same data, clock and screen states as a11y_audit.py, in light and dark, plus
# regions whose wording or currency differs (UK nations, euro countries, New Zealand).
import datetime, json, os, sys
from playwright.sync_api import sync_playwright

if sys.argv[1:2] == ['--compare']:
    from PIL import Image, ImageChops
    a, b = sys.argv[2], sys.argv[3]
    names = sorted(set(os.listdir(a)) | set(os.listdir(b)))
    bad = 0
    for n in names:
        pa, pb = os.path.join(a, n), os.path.join(b, n)
        if not (os.path.exists(pa) and os.path.exists(pb)):
            print('MISSING', n); bad += 1; continue
        ia, ib = Image.open(pa).convert('RGB'), Image.open(pb).convert('RGB')
        if ia.size != ib.size:
            print('SIZE', n, ia.size, ib.size); bad += 1; continue
        box = ImageChops.difference(ia, ib).getbbox()
        if box: print('DIFF', n, box); bad += 1
    print(f'{len(names) - bad} / {len(names)} identical')
    sys.exit(1 if bad else 0)

OUT = sys.argv[1]
BASE = os.environ.get("SNAP_URL", "http://localhost:5173")
LANG = os.environ.get("SNAP_LANG", "en")
WIDTH = int(os.environ.get("SNAP_WIDTH", "390"))
WIDE = []  # screens wider than the window: something doesn't fit
os.makedirs(OUT, exist_ok=True)
OB_FORWARD = ['Get started', 'Continue in the browser', 'Continue', 'Continue', 'Continue', 'Continue']
def ob(n, extra=''):
    seq = json.dumps(OB_FORWARD[:n])
    return ("(async () => { for (const t of " + seq + ") { await new Promise(r => setTimeout(r, 80)); "
            "(document.querySelector('.ob-step .btn-primary, .ob-step .ob-secondary')).click(); } "
            "await new Promise(r => setTimeout(r, 80)); " + extra + " })()")
STATES = [
    ('onboarding-1-welcome', '/onboarding', None),
    ('onboarding-2-install', '/onboarding', ob(1)),
    ('onboarding-3-privacy', '/onboarding', ob(2)),
    ('onboarding-4-practice', '/onboarding', ob(3, "document.querySelector('.ob-practice .day-cell').click(); document.querySelector('.ob-practice .day-cell').click();")),
    ('onboarding-5-intention', '/onboarding', ob(4)),
    ('onboarding-6-region', '/onboarding', ob(5)),
    ('onboarding-7-ready', '/onboarding', ob(6)),
    ('checkin', '/', None),
    ('checkin-selected-past', '/', "document.querySelectorAll('.day-cell')[3].click()"),
    ('trends', '/trends', None),
    ('trends-details', '/trends', "document.querySelectorAll('.tr-dow-row')[4].click(); document.querySelectorAll('.wg-tile')[10].click();"),
    ('trends-all-time', '/trends', "[...document.querySelectorAll('button, option')].find(b => /All time|Gesamt/.test(b.textContent))?.click()"),
    ('review-month', '/trends/review?year=2026&month=8', "document.querySelector('.rv-include summary').click()"),
    ('review-year', '/trends/review?year=2026', None),
    ('milestones', '/milestones', None),
    ('milestones-all', '/milestones/all', None),
    ('challenges', '/milestones/challenges', None),
    ('settings', '/settings', None),
    ('settings-savings-form', '/settings', "[...document.querySelectorAll('.st-link')].find(b=>/Change|Ändern/.test(b.textContent)).click()"),
    ('settings-erase-dialog', '/settings', "[...document.querySelectorAll('button')].find(b=>/Erase all data|Alle Daten löschen/.test(b.textContent)).click()"),
    ('about', '/settings/about', None),
    ('help', '/settings/help', None),
    ('help-contact', '/settings/help?topic=contact', None),
    ('resources', '/settings/resources', None),
    ('intention', '/intention', None),
    ('backup', '/settings/backup', None),
    ('backup-passphrase', '/settings/backup', "[...document.querySelectorAll('button')].find(b=>/^(Continue|Weiter)$/.test(b.textContent)).click()"),
    ('restore', '/settings/restore', None),
]
# Screens whose text or money depends on the region, shown for other regions too.
REGIONAL = ['resources', 'settings', 'trends', 'review-month', 'onboarding-6-region']
REGIONS = [('uk-sct', {'country': 'uk', 'province': 'ca_ab', 'nation': 'sct'}), ('de', {'country': 'de', 'province': 'ca_ab'}),
           ('at', {'country': 'at', 'province': 'ca_ab'}), ('nz', {'country': 'nz', 'province': 'ca_ab'}), ('us', {'country': 'us', 'province': 'ca_ab'})]

with sync_playwright() as p:
    b = p.chromium.launch()
    for theme in ['light', 'dark']:
        ctx = b.new_context(viewport={"width": WIDTH, "height": 844}, timezone_id="America/Vancouver", locale='en-CA')
        pg = ctx.new_page()
        pg.clock.install(time=datetime.datetime(2026, 9, 30, 20, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=-7))))
        pg.goto(BASE + "/#/settings"); pg.wait_for_timeout(400)
        pg.evaluate(f"""async () => {{ localStorage.setItem('ct-appearance', JSON.stringify({{theme:'{theme}',highContrast:false}}));
          const db = await import('/src/data/database.ts'); const h = await import('/test/helpers.ts');
          const s=h.scenario(42,'2026-09-30',{{}}); await db.restoreFromBackup(s.entries, s.intentions); await db.setSetting('onboarding_complete','true');
          await db.setSetting('savings_baseline_per_week','14'); await db.setSetting('language','{LANG}'); await db.setSetting('savings_price_per_drink','9');
          await db.setChallenges({{weekendRuns:[{{from:'2026-06-05'}}],weekRuns:[],months:['2026-09','2026-12']}}); }}""")
        runs = [('ca', {'country': 'ca', 'province': 'ca_bc'}, STATES)] + (
            [(k, r, [s for s in STATES if s[0] in REGIONAL]) for k, r in REGIONS] if theme == 'light' else [])
        for rkey, region, states in runs:
            pg.evaluate(f"async () => (await import('/src/data/database.ts')).setSetting('region', {json.dumps(json.dumps(region))})")
            for name, path, setup in states:
                pg.evaluate(f"async () => (await import('/src/data/database.ts')).setSetting('onboarding_complete', '{'false' if path == '/onboarding' else 'true'}')")
                pg.goto(BASE + "/#" + path); pg.reload(); pg.wait_for_timeout(900)
                if setup:
                    try: pg.evaluate(setup)
                    except Exception as e: print('setup failed:', name, str(e).splitlines()[0])
                    pg.wait_for_timeout(500)
                pg.screenshot(path=os.path.join(OUT, f"{name}--{rkey}--{theme}.png"), full_page=True, animations='disabled', caret='hide')
                if pg.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth"): WIDE.append(f"{name}--{rkey}--{theme}")
        ctx.close()
    b.close()
print('saved', len(os.listdir(OUT)), 'screenshots to', OUT)
print('wider than the window:', ', '.join(WIDE) or 'none')
