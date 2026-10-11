// Screenshot each route's loading skeleton next to the real page, with the same chrome (top bar, tape, context bar).
//   node scripts/skeleton-compare.mjs <baseUrl> <outDir> [/route ...] [--light] [--widths=390,768,1024,1280,1440,1920]
// For every route and width: <name>.<w>.real.png, <name>.<w>.skel.png (the skeleton from /design/loading?path=…
// swapped into the real page's <main>), and <name>.<w>.pair.png side by side. Prints how far down the skeleton reaches
// against the window, and any horizontal overflow.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const [base, outDir, ...rest] = process.argv.slice(2);
const light = rest.includes('--light');
const widthsArg = rest.find((r) => r.startsWith('--widths='));
const widths = widthsArg ? widthsArg.slice(9).split(',').map(Number).filter(Boolean) : [390, 768, 1024, 1280, 1440, 1920];
const routes = rest.filter((r) => r.startsWith('/'));
const ROUTES = routes.length ? routes : ['/', '/chart/pools', '/news', '/charts', '/tx-sizes', '/privacy', '/activity', '/metrics', '/btc-bull-run', '/compare'];
// real device windows: phone, portrait tablet, landscape tablet, laptops, large desktop
const HEIGHT = { 390: 844, 768: 1024, 1024: 768, 1280: 800, 1440: 900, 1920: 1080 };
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const open = async (url, w) => {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: HEIGHT[w] ?? (w > 600 ? 900 : 844) });
  if (light) await page.evaluateOnNewDocument(() => localStorage.setItem('zec-theme', 'light'));
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  return page;
};

for (const route of ROUTES) {
  for (const w of widths) {
    const name = `${route === '/' ? 'home' : route.slice(1).replace(/\//g, '_')}.${w}${light ? '.light' : ''}`;
    const real = await open(base + route, w);
    await new Promise((r) => setTimeout(r, 400));
    await real.screenshot({ path: path.join(outDir, `${name}.real.png`) });
    const realH = await real.evaluate(() => document.querySelector('main').getBoundingClientRect().height);

    // the skeleton markup and its stylesheets, from the preview route
    const prev = await open(`${base}/design/loading?path=${encodeURIComponent(route)}`, w);
    const { html, css } = await prev.evaluate(() => ({
      html: document.querySelector('main').innerHTML,
      css: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href),
    }));
    await prev.close();

    await real.evaluate(async (html, css) => {
      const have = new Set([...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href));
      await Promise.all(css.filter((h) => !have.has(h)).map((h) => new Promise((res) => {
        const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = h; l.onload = l.onerror = res; document.head.append(l);
      })));
      document.querySelector('main').innerHTML = html;
      window.scrollTo(0, 0);
    }, html, css);
    await new Promise((r) => setTimeout(r, 300));
    const m = await real.evaluate(() => ({ h: document.querySelector('main').getBoundingClientRect().bottom, over: document.documentElement.scrollWidth > innerWidth + 1, vh: innerHeight }));
    await real.screenshot({ path: path.join(outDir, `${name}.skel.png`) });
    await real.close();

    execFileSync('magick', [path.join(outDir, `${name}.real.png`), path.join(outDir, `${name}.skel.png`), '+append', path.join(outDir, `${name}.pair.png`)]);
    console.log(`${route.padEnd(14)} ${String(w).padStart(4)}px  skeleton reaches ${Math.round(m.h)}px of a ${m.vh}px window (page main ${Math.round(realH)}px)${m.over ? '  OVERFLOW-X' : ''}`);
  }
}
await browser.close();
