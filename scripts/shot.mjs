// Screenshot routes of a running dev server at desktop + phone width, and flag horizontal overflow.
//   node scripts/shot.mjs <baseUrl> <outDir> /route [/route ...] [--light] [--full] [--widths=390,768,1024,1280,1440,1920]
// Writes <outDir>/<route>.<w>.png (first screen, or full page with --full) and prints page height + overflow.
// --widths replaces the default 1440 + 390; every width below 600 gets a phone-height window (844), the rest 900.
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const [base, outDir, ...rest] = process.argv.slice(2);
const light = rest.includes('--light');
const full = rest.includes('--full');
const routes = rest.filter((r) => r.startsWith('/'));
const widthsArg = rest.find((r) => r.startsWith('--widths='));
const widths = widthsArg ? widthsArg.slice(9).split(',').map(Number).filter(Boolean) : [1440, 390];
fs.mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
for (const route of routes) {
  for (const w of widths) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
    await page.setViewport({ width: w, height: w > 600 ? 900 : 844 });
    if (light) await page.evaluateOnNewDocument(() => localStorage.setItem('zec-theme', 'light'));
    const res = await page.goto(base + route, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 400));
    const m = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, over: document.documentElement.scrollWidth > window.innerWidth + 1 }));
    const name = (route === '/' ? 'home' : route.slice(1).replace(/\//g, '_')) + `.${w}${light ? '.light' : ''}.png`;
    await page.screenshot({ path: path.join(outDir, name), fullPage: full });
    console.log(`${String(res?.status()).padEnd(4)} ${route.padEnd(28)} ${w}px  h=${m.h}${m.over ? '  OVERFLOW-X' : ''}${errors.length ? '  ERRORS: ' + errors.join(' | ') : ''}`);
    await page.close();
  }
}
await browser.close();
