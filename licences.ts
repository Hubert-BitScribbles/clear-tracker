// Builds licenses.txt: every open-source component that ships in the app,
// with its full licence text (and NOTICE, where it has one), plus the
// sounds' source. Collected from the modules actually in the build, so it
// stays complete as packages change. Linked from About → Credits.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

// The service worker is built separately (vite-plugin-pwa → Workbox), so its
// parts aren't among the app's modules. checks/licences.py compares this
// list with the built service worker.
export const SERVICE_WORKER = ['workbox-core', 'workbox-precaching', 'workbox-routing', 'workbox-strategies'];

const read = (dir: string, prefixes: string[]) =>
  readdirSync(dir)
    .filter((f) => prefixes.some((p) => f.toUpperCase().startsWith(p)))
    .map((f) => readFileSync(join(dir, f), 'utf8').trim());

function describe(name: string) {
  const dir = join('node_modules', name);
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const repo = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  const raw = (pkg.homepage || repo || `https://www.npmjs.com/package/${name}`).replace(/^git\+/, '').replace(/\.git$/, '');
  const home = /^https?:/.test(raw) ? raw : `https://github.com/${raw.replace(/^github:/, '')}`;
  const licence = read(dir, ['LICENSE', 'LICENCE', 'OFL', 'COPYING']);
  if (!licence.length) throw new Error(`No licence file for ${name}: add it by hand before shipping.`);
  return { name, version: pkg.version as string, licence: pkg.license as string, home, texts: [...licence, ...read(dir, ['NOTICE'])] };
}

export function licences(version: string): Plugin {
  return {
    name: 'clear-tracker-licences',
    apply: 'build',
    generateBundle(_, bundle) {
      const names = new Set(SERVICE_WORKER);
      const add = (id: string) => {
        const m = id.match(/node_modules\/((?:@[^/]+\/)?[^/]+)\//);
        if (m) names.add(m[1]);
      };
      // Code that ends up in the shipped files (not modules the build
      // loaded and then dropped), and the fonts' files.
      for (const out of Object.values(bundle)) {
        if (out.type === 'chunk') for (const [id, m] of Object.entries(out.modules)) if (m.renderedLength > 0) add(id);
        if (out.type === 'asset') for (const id of out.originalFileNames ?? []) add(id);
      }
      const parts = [...names].sort().map(describe);
      const rule = '='.repeat(72);
      const text = [
        `Clear Tracker ${version} — licences`,
        '',
        'Clear Tracker is free and open source: https://github.com/Hubert-BitScribbles/clear-tracker',
        'Its own code is under the MIT licence (in the repository). The names "Clear Tracker"',
        'and "bitScribbles" and the logos are not covered by it.',
        '',
        'It is built with these open-source components, each under its own licence:',
        '',
        ...parts.map((p) => `  ${p.name} ${p.version} (${p.licence}) — ${p.home}`),
        '',
        'Sounds: the Clear chime and the A lot hum are from Mixkit (https://mixkit.co),',
        'used under the Mixkit Sound Effects Free License (https://mixkit.co/license/);',
        'the A few and Moderate tones are those two, pitch-shifted for Clear Tracker.',
        'They are not covered by the MIT licence and may not be reused from this app.',
        '',
        ...parts.flatMap((p) => [rule, `${p.name} ${p.version}`, rule, '', ...p.texts.flatMap((x) => [x, ''])]),
      ].join('\n');
      // A byte-order mark, so browsers read it as UTF-8 whatever the server says.
      this.emitFile({ type: 'asset', fileName: 'licenses.txt', source: '\uFEFF' + text });
    },
  };
}

