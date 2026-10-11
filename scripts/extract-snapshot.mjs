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

for (const [route, res] of Object.entries(snap.pages)) {
  const name = route === '/' ? 'index' : route.slice(1).replace(/\//g, '__');
  fs.writeFileSync(path.join(pagesDir, `${name}.html`), res.html);
}

// Two lists exist only as server-rendered HTML on the live site (no /api route). Parse them into JSON so pages read
// them through the same data seam: /wall-of-shame (the incident table) and /privacy-suggestions (ranked round amounts).
const unescape = (t) => t.replace(/&rarr;/g, '→').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
const text = (h) => unescape(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const toNum = (t) => Number(t.replace(/,/g, ''));
const MATCH = { ZEC: 'zec', USD: 'usd', 'ZEC+USD': 'both' };

function parseWallOfShame(html) {
  const body = html.slice(html.indexOf('<tbody'), html.indexOf('</tbody>'));
  return [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(([, tr]) => {
    const tds = [...tr.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)];
    const sort = tds.map(([, attrs]) => unescape(attrs.match(/data-sort="([^"]*)"/)[1]));
    const txt = tds.map(([, , inner]) => text(inner));
    const block = (i) => Number(txt[i].match(/#(\d+)/)[1]);
    const zecOf = (i) => toNum(txt[i].match(/([\d,.]+) ZEC/)[1]);
    const [fromPool, toPool] = sort[6].split('→').map((x) => x.trim());
    return {
      shield_time: Number(sort[0]), shield_block: block(0), usd_in: Math.round(Number(sort[1]) * 100) / 100, zec_in: zecOf(1),
      deshield_time: Number(sort[2]), deshield_block: block(2), usd_out: Math.round(Number(sort[3]) * 100) / 100, zec_out: zecOf(3),
      gap_secs: Number(sort[4]), match: MATCH[tds[5][2].match(/wos-badge[^>]*>([^<]+)</)[1].replace(/\s/g, '')], diff_pct: Number(txt[5].match(/([\d.]+)%/)[1]),
      from_pool: fromPool, to_pool: toPool,
    };
  });
}

function parsePrivacySuggestions(html) {
  const meta = html.match(/Generated ([^<]+?) from ([\d,]+) shielding \+ ([\d,]+) deshielding/);
  const cols = html.split('<div class="ps-col">').slice(1).map((col) => ({
    direction: /Shielding/.test(col.match(/<h2[^>]*>([^<]+)<\/h2>/)[1]) ? 'shield' : 'deshield',
    buckets: [...col.matchAll(/<h3>([^<]+)<\/h3>([\s\S]*?)(?=<div class="ps-bucket">|<details)/g)].map(([, range, b]) => ({
      range: unescape(range),
      amounts: [...b.matchAll(/<span class="a">([\d.]+) ZEC<\/span>[\s\S]*?<span class="c">([\d,]+)<\/span>/g)].map(([, a, c]) => ({ amount: Number(a), count: toNum(c) })),
    })),
    recent: [...col.matchAll(/<td class="dt">([^<]+)<\/td><td class="amt">([^<]+)<\/td><td class="rnd">([^<]*)<\/td>/g)].map(([, date, amount, rnd]) => {
      const r = unescape(rnd).replace('→', '').trim();
      return { date, amount: Number(amount), rounded: r === '—' || r === '' ? null : Number(r) };
    }),
  }));
  return { generated: meta[1], shield_tx: toNum(meta[2]), deshield_tx: toNum(meta[3]), columns: cols };
}

for (const [name, parse] of [['wall-of-shame', parseWallOfShame], ['privacy-suggestions', parsePrivacySuggestions]]) {
  const page = snap.pages[`/${name}`];
  if (!page) continue;
  const body = JSON.stringify(parse(page.html));
  fs.writeFileSync(path.join(apiDir, `${name}.json`), body);
  manifest.endpoints[name] = { route: `/${name}`, bytes: body.length, parsedFrom: 'page html' };
}
fs.writeFileSync(path.join(apiDir, '_manifest.json'), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(rawDir, 'charts.js'), snap.static['/static/charts.js'] ?? '');

console.log(`${Object.keys(manifest.endpoints).length} endpoints -> data/api, ${Object.keys(snap.pages).length} pages -> data/raw/pages (captured ${manifest.capturedAt})`);
