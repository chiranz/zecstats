// Split the zecstats.com snapshot into per-endpoint JSON files the app reads as mock data.
//   data/raw/zecstats-snapshot-*.json  ->  data/api/<endpoint>.json  (+ data/raw/pages/*.html for reference)
// Run: pnpm extract-data
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const rawDir = path.join(root, 'data/raw');
const snapFile = fs.readdirSync(rawDir).filter((f) => /^zecstats-snapshot-.*\.json$/.test(f)).sort().at(-1);
if (!snapFile) throw new Error('No data/raw/zecstats-snapshot-*.json found');

const snap = JSON.parse(fs.readFileSync(path.join(rawDir, snapFile), 'utf8'));
const apiDir = path.join(root, 'data/api');
const pagesDir = path.join(rawDir, 'pages');
fs.mkdirSync(apiDir, { recursive: true });
fs.mkdirSync(pagesDir, { recursive: true });

const manifest = { source: snap.meta.source, capturedAt: snap.meta.captured_at, endpoints: {} };
for (const [route, res] of Object.entries(snap.api)) {
  if (res.status !== 200 || !('body' in res)) continue;
  const name = route.replace(/^\/api\//, '').replace(/\//g, '_');
  const body = JSON.stringify(res.body);
  fs.writeFileSync(path.join(apiDir, `${name}.json`), body);
  manifest.endpoints[name] = { route, bytes: body.length };
}
fs.writeFileSync(path.join(apiDir, '_manifest.json'), JSON.stringify(manifest, null, 2));

for (const [route, res] of Object.entries(snap.pages)) {
  const name = route === '/' ? 'index' : route.slice(1).replace(/\//g, '__');
  fs.writeFileSync(path.join(pagesDir, `${name}.html`), res.html);
}
fs.writeFileSync(path.join(rawDir, 'charts.js'), snap.static['/static/charts.js'] ?? '');

console.log(`${Object.keys(manifest.endpoints).length} endpoints -> data/api, ${Object.keys(snap.pages).length} pages -> data/raw/pages (captured ${manifest.capturedAt})`);
