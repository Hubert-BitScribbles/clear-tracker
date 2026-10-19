# After `npm run build`: licenses.txt lists every open-source part that
# ships. Compares it with the packages behind the built code (from source
# maps) and the parts of Workbox in the built service worker. No dev server.
import json, glob, os, re, subprocess, sys, tempfile

results = []
def check(name, ok, detail=''):
    results.append(ok); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else f'  [{detail}]'))

text = open('dist/licenses.txt', encoding='utf-8').read()
listed = set(re.findall(r'^  (\S+) \d', text, re.M))

out = tempfile.mkdtemp()
subprocess.run(['npx', 'vite', 'build', '--sourcemap', '--outDir', out, '--emptyOutDir', '--logLevel', 'error'], check=True)
shipped = set()
for m in glob.glob(out + '/**/*.map', recursive=True):
    for s in json.load(open(m)).get('sources', []):
        r = re.search(r'node_modules/((?:@[^/]+/)?[^/]+)/', s)
        if r: shipped.add(r.group(1))
fonts = {re.sub(r'-latin.*', '', os.path.basename(f)) for f in glob.glob('dist/assets/*.woff2')}
workbox = {f'workbox-{p}' for f in glob.glob('dist/workbox-*.js') for p in re.findall(r'workbox:([a-z-]+):', open(f).read())}

check('every package in the built code is listed', shipped <= listed, sorted(shipped - listed))
check('every font shipped is listed', {f'@fontsource/{f}' for f in fonts} <= listed, sorted(fonts))
check('every part of Workbox in the service worker is listed', workbox <= listed, sorted(workbox - listed))
check('nothing listed that isn\'t shipped', listed <= shipped | {f'@fontsource/{f}' for f in fonts} | workbox, sorted(listed - shipped))
check('Dexie\'s NOTICE is included', 'Copyright (c) 2014-2017 David Fahlander' in text)
check('the sounds\' source is named', 'Mixkit Sound Effects Free License' in text)
check('licenses.txt is cached for offline use', 'licenses.txt' in open('dist/sw.js').read())
print(f'{sum(results)} / {len(results)} passed')
sys.exit(0 if all(results) else 1)
