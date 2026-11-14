# The install how-to clips (1.6.0): who gets "Show me how", what opening it
# does, reduced motion, offline, and that the clips aren't precached.
#   python3 checks/clips.py        (dev server on 5173; run `npm run build` first for the precache check)
# Chromium here can't decode H.264, so this checks the video element and the
# download, not playback; try it on an iPhone too.
import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get("CHECK_URL", "http://localhost:5173")
IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/{v} Mobile/15E148 Safari/604.1"
UA = {
    'iPhone Safari 27': IOS.format(v='27.2'),
    'iPhone Safari 26': IOS.format(v='26.1'),
    'iPhone Chrome': "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.7339.122 Mobile/15E148 Safari/604.1",
    'iPad Safari 27': "Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1",
    'Android Chrome': "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
    'Mac Safari': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Safari/605.1.15",
}
res = []
def check(name, ok, detail=''):
    res.append(ok); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else f'  -> {detail}'))

def install_step(b, ua, locale='en-CA', tz='America/Vancouver', **ctx_args):
    ctx = b.new_context(viewport={"width": 390, "height": 844}, user_agent=ua, locale=locale, timezone_id=tz, **ctx_args)
    pg = ctx.new_page(); pg.errors = []; pg.on('pageerror', lambda e: pg.errors.append(str(e)))
    pg.goto(BASE + '/#/onboarding'); pg.wait_for_timeout(1000)
    pg.locator('.ob-button').first.click(); pg.wait_for_timeout(300)
    return ctx, pg

with sync_playwright() as p:
    b = p.chromium.launch()
    # Who's offered a clip, and which.
    for name, want in (('iPhone Safari 27', 'safari'), ('iPhone Chrome', 'chrome'), ('iPhone Safari 26', None),
                       ('iPad Safari 27', None), ('Android Chrome', None), ('Mac Safari', None)):
        ctx, pg = install_step(b, UA[name])
        n = pg.locator('.ic-toggle').count()
        check(f'{name}: {"offers " + want + " clip" if want else "no clip"}', n == (1 if want else 0), n)
        if want:
            tg = pg.locator('.ic-toggle')
            check(f'{name}: closed at first, nothing downloaded', tg.get_attribute('aria-expanded') == 'false' and pg.locator('.ic video').count() == 0)
            label = ' '.join(tg.text_content().replace('\n', ' ').split(' ')).strip()
            label = ' '.join(x for x in label.split(' ') if x)
            check(f'{name}: "Show me how" and its length', label == ('▶︎ Show me how · 26\u00a0s video' if want == 'safari' else '▶︎ Show me how · 24\u00a0s video'), label)
            check(f'{name}: toggle is 44px tall', tg.bounding_box()['height'] >= 44, tg.bounding_box())
            with pg.expect_response(lambda r: f'/clips/install-iphone-{want}.mp4' in r.url) as resp:
                tg.click()
            r = resp.value
            check(f'{name}: the clip downloads (200, video/mp4)', r.status == 200 and 'video/mp4' in (r.headers.get('content-type') or ''), (r.status, r.headers.get('content-type')))
            pg.wait_for_timeout(500)
            v = pg.evaluate("""() => { const v = document.querySelector('.ic video'); return v && {
                src: v.getAttribute('src') || '', muted: v.muted && v.hasAttribute('muted'), loop: v.loop, inline: v.hasAttribute('playsinline'),
                autoplay: v.autoplay, controls: v.controls, poster: v.getAttribute('poster'), label: v.getAttribute('aria-label') || '' } }""")
            check(f'{name}: opened: a muted, looping, inline video that plays by itself, from memory',
                  v and v['src'].startswith('blob:') and v['muted'] and v['loop'] and v['inline'] and v['autoplay'] and not v['controls'], v)
            check(f'{name}: poster frame and a label matching the steps',
                  v and v['poster'] == f'/clips/install-iphone-{want}.jpg' and ('≡' in v['label'] if want == 'safari' else 'address bar' in v['label']), v)
            check(f'{name}: toggle says Hide the video', tg.get_attribute('aria-expanded') == 'true' and tg.text_content().strip() == 'Hide the video', tg.text_content())
            check(f'{name}: the written steps are still there', pg.locator('.ob-steps > li').count() == 4)
            tg.click(); pg.wait_for_timeout(200)
            check(f'{name}: Hide removes the video', pg.locator('.ic video').count() == 0)
        check(f'{name}: no page errors', not pg.errors, pg.errors[:2])
        ctx.close()

    # Reduced motion: a still with controls; it moves only if played.
    ctx, pg = install_step(b, UA['iPhone Safari 27'], reduced_motion='reduce')
    pg.locator('.ic-toggle').click(); pg.wait_for_timeout(600)
    v = pg.evaluate("() => { const v = document.querySelector('.ic video'); return v && { autoplay: v.autoplay, controls: v.controls } }")
    check('reduced motion: no autoplay, controls shown', v == {'autoplay': False, 'controls': True}, v)
    ctx.close()

    # axe on the open clip, light and dark.
    AXE = open(os.path.join(os.path.dirname(__file__), '..', 'node_modules', 'axe-core', 'axe.min.js')).read()
    for theme in ('light', 'dark'):
        ctx, pg = install_step(b, UA['iPhone Safari 27'], color_scheme=theme)
        pg.locator('.ic-toggle').click(); pg.wait_for_timeout(600)
        pg.add_script_tag(content=AXE)
        bad = pg.evaluate("""async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'] } }))
            .violations.map(v => v.id + ': ' + v.nodes.map(n => n.target.join(' ')).join(', '))""")
        check(f'axe, clip open ({theme}): no violations', not bad, bad)
        ctx.close()

    # Offline: a short note instead of a broken video.
    ctx, pg = install_step(b, UA['iPhone Safari 27'])
    ctx.set_offline(True)
    pg.locator('.ic-toggle').click(); pg.wait_for_timeout(800)
    check('offline: a note, no video', pg.locator('.ic-note').count() == 1 and pg.locator('.ic video').count() == 0, pg.locator('.ic').inner_text())
    ctx.close()

    # English only for now: German and French keep the written steps.
    for loc, tz in (('de-DE', 'Europe/Berlin'), ('fr-FR', 'Europe/Paris')):
        ctx, pg = install_step(b, UA['iPhone Safari 27'], locale=loc, tz=tz)
        check(f'{loc}: no clip until the reviewers confirm the labels', pg.locator('.ic-toggle').count() == 0)
        ctx.close()

    # Help → Installing: offered in a browser tab, not in the installed app.
    for installed in (False, True):
        ctx = b.new_context(viewport={"width": 390, "height": 844}, user_agent=UA['iPhone Safari 27'], locale='en-CA')
        if installed:
            ctx.add_init_script("Object.defineProperty(navigator, 'standalone', { get: () => true })")
        pg = ctx.new_page()
        pg.goto(BASE + '/#/settings'); pg.wait_for_timeout(300)
        pg.evaluate("async () => (await import('/src/data/database.ts')).setSetting('onboarding_complete', 'true')")
        pg.goto(BASE + '/#/settings/help?topic=install'); pg.reload(); pg.wait_for_timeout(900)
        n = pg.locator('.ic-toggle').count()
        check(f'Help → Installing, {"installed app: no clip" if installed else "browser tab: clip offered"}', n == (0 if installed else 1), n)
        ctx.close()
    b.close()

# The clips are only for people who ask: not in the service worker's precache.
if os.path.exists('dist/sw.js'):
    sw = open('dist/sw.js').read()
    check('dist: clips and posters not precached', '/clips/' not in sw and 'install-iphone' not in sw)
    check('dist: clips copied into the build', all(os.path.exists(f'dist/clips/install-iphone-{w}.{x}') for w in ('safari', 'chrome') for x in ('mp4', 'jpg')))
else:
    print('(no dist/: run `npm run build` to check the precache)')

print(f'{sum(res)} / {len(res)} passed')
raise SystemExit(0 if all(res) else 1)
