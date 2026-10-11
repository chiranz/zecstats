import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import type { ReactElement, ReactNode } from 'react';
import { dateLong } from '@/lib/format';

// Social cards (1200×630), the "Social cards" artboard on the design canvas: always the dark identity, the signal-bars
// mark + wordmark, the page's question, the key figure in mono with its ▲/▼ change, the data date and the address.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = 'image/png';

// ImageResponse can't read CSS variables: these mirror the dark tokens in app/globals.css (the card is always dark).
const C = {
  bg: '#050a06', line: '#1f3a2a', inset: '#07100a', value: '#ecf8ef', text2: '#a3c2ad', muted: '#7f9c89',
  accent: '#00ff66', up: '#00ff66', down: '#ff7a6b', markLine: '#163d27', glow: '0 0 14px rgba(0,255,102,.45)',
};
export const OG_POOL_COLOR = { transparent: '#77837c', sprout: '#7a86a8', sapling: '#38bdf8', orchard: '#a78bfa', ironwood: '#00ff66' } as const;

const MONO = 'JetBrains Mono';
const SANS = 'Geist';

// Fonts are read from disk (builds may be offline): JetBrains Mono Regular (SIL OFL 1.1, the site's numeral face) ships
// next to this file; the sans is the Geist Regular that next/og bundles. Only the regular cuts exist, so every weight is 400.
let fontsP: Promise<{ name: string; data: Buffer; weight: 400; style: 'normal' }[]> | null = null;
function fonts() {
  fontsP ??= Promise.all([
    readFile(join(process.cwd(), 'components/seo/fonts/JetBrainsMono-Regular.woff')),
    readFile(join(process.cwd(), 'node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf')).catch(() => null),
  ]).then(([mono, sans]) => [
    { name: MONO, data: mono, weight: 400 as const, style: 'normal' as const },
    ...(sans ? [{ name: SANS, data: sans, weight: 400 as const, style: 'normal' as const }] : []),
  ]);
  return fontsP;
}

export type OgDelta = { text: string; dir: 'up' | 'dn' | 'flat' };

/** "▲ 8.7% vs 28 days earlier" (or "▲ 8.7% in 28 days" where space is short) from a headline change. */
export function changeDelta(change: { pct: number; days: number } | null | undefined, short = false): OgDelta | undefined {
  if (!change || !Number.isFinite(change.pct)) return undefined;
  const a = Math.abs(change.pct).toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  return { text: `${change.pct >= 0 ? '▲' : '▼'} ${a}% ${short ? `in ${change.days} days` : `vs ${change.days} days earlier`}`, dir: change.pct >= 0 ? 'up' : 'dn' };
}

const dColor = (d: OgDelta) => (d.dir === 'up' ? C.up : d.dir === 'dn' ? C.down : C.muted);

function Mark() {
  return (
    <svg width="52" height="52" viewBox="0 0 48 48">
      <rect width="48" height="48" rx="10" fill={C.bg} />
      <rect x="0.75" y="0.75" width="46.5" height="46.5" rx="9.25" fill="none" stroke={C.markLine} strokeWidth="1.5" />
      <rect x="9" y="27" width="8" height="12" rx="1.5" fill={C.accent} />
      <rect x="20" y="19" width="8" height="20" rx="1.5" fill={C.accent} />
      <rect x="31" y="9" width="8" height="30" rx="1.5" fill={C.accent} />
    </svg>
  );
}

function Frame({ kicker, path, dataThrough, children }: { kicker: string; path: string; dataThrough: string; children: ReactNode }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '56px 72px 48px', background: C.bg, border: `1px solid ${C.line}`, fontFamily: MONO, color: C.value }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Mark />
          <div style={{ display: 'flex', fontSize: 32, letterSpacing: 5, color: C.accent, textShadow: C.glow }}>ZEC STATS</div>
        </div>
        <div style={{ display: 'flex', fontSize: 20, letterSpacing: 2.4, textTransform: 'uppercase', color: C.muted }}>{kicker}</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px 0 22px' }}>{children}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.line}`, paddingTop: 22, fontSize: 22, color: C.text2 }}>
        <div style={{ display: 'flex' }}>{`Data through ${dateLong(dataThrough)}`}</div>
        <div style={{ display: 'flex', color: C.accent }}>{`zecstats.com${path === '/' ? '' : path}`}</div>
      </div>
    </div>
  );
}

const qSize = (q: string, base: number) => (q.length <= 40 ? base : q.length <= 70 ? Math.round(base * 0.82) : Math.round(base * 0.7));
const figSize = (v: string, base: number) => (v.length <= 7 ? base : v.length <= 10 ? Math.round(base * 0.8) : Math.round(base * 0.6));

function Question({ text, size, width = 1000 }: { text: string; size: number; width?: number }) {
  return <div style={{ display: 'flex', fontSize: size, lineHeight: 1.15, letterSpacing: -0.5, color: C.value, maxWidth: width }}>{text}</div>;
}

function Answer({ text }: { text: string }) {
  return <div style={{ display: 'flex', fontFamily: `${SANS}, ${MONO}`, fontSize: 27, lineHeight: 1.35, color: C.text2 }}>{text}</div>;
}

async function render(node: ReactNode) {
  return new ImageResponse(node as ReactElement, { ...OG_SIZE, fonts: await fonts() });
}

/* ---------- variants ---------- */

export type Kpi = { label: string; value: string; delta?: OgDelta; accent?: boolean };

/** Default card: the site's promise and three headline numbers. */
export function defaultCard({ kpis, dataThrough }: { kpis: Kpi[]; dataThrough: string }) {
  return render(
    <Frame kicker="Zcash network statistics" path="/" dataThrough={dataThrough}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Question text="Every Zcash number, from our own node" size={56} width={760} />
        <Answer text="Price, shielded supply, the Ironwood migration and 58 charts, computed from a Zebra full node." />
        <div style={{ display: 'flex', marginTop: 10, border: `1px solid ${C.line}`, borderRadius: 12 }}>
          {kpis.map((k, i) => (
            <div key={k.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, padding: '18px 24px', borderLeft: i ? `1px solid ${C.line}` : 'none' }}>
              <div style={{ display: 'flex', fontSize: 18, letterSpacing: 1.8, textTransform: 'uppercase', color: C.muted }}>{k.label}</div>
              <div style={{ display: 'flex', fontSize: 48, lineHeight: 1.05, letterSpacing: -1, color: k.accent ? C.accent : C.value }}>{k.value}</div>
              {k.delta && <div style={{ display: 'flex', fontSize: 20, color: dColor(k.delta) }}>{k.delta.text}</div>}
            </div>
          ))}
        </div>
      </div>
    </Frame>,
  );
}

/** Chart card: chart title, its question, the key figure with its change, and the chart's own sparkline. */
export function chartCard(o: { kicker: string; path: string; title: string; question: string; value?: string; delta?: OgDelta; spark?: number[]; dataThrough: string }) {
  const pts = (o.spark ?? []).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const W = 400, H = 200;
  let poly = '', last: [number, number] | null = null;
  if (pts.length >= 2) {
    const lo = Math.min(...pts), hi = Math.max(...pts), span = hi - lo || 1;
    const xy = pts.map((v, i) => [(i * W) / (pts.length - 1), H - ((v - lo) / span) * H] as [number, number]);
    poly = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    last = xy.at(-1)!;
  }
  const hasFig = !!o.value && /\d/.test(o.value);
  return render(
    <Frame kicker={o.kicker} path={o.path} dataThrough={o.dataThrough}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 48 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', fontSize: 22, letterSpacing: 0.4, color: C.muted }}>{o.title}</div>
          <Question text={o.question} size={hasFig ? qSize(o.question, 44) : qSize(o.question, 56)} />
          {hasFig && <div style={{ display: 'flex', fontSize: figSize(o.value!, 112), lineHeight: 1, letterSpacing: -4, color: C.value, marginTop: 6 }}>{o.value}</div>}
          {o.delta && <div style={{ display: 'flex', fontSize: 30, color: dColor(o.delta) }}>{o.delta.text}</div>}
        </div>
        {poly && (
          <svg width={W + 16} height={H + 24} viewBox={`-8 -12 ${W + 16} ${H + 24}`}>
            <line x1="0" y1={H} x2={W} y2={H} stroke={C.line} strokeWidth="2" />
            <polyline fill="none" stroke={C.accent} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={poly} />
            {last && <circle cx={last[0]} cy={last[1]} r="6" fill={C.accent} />}
          </svg>
        )}
      </div>
    </Frame>,
  );
}

/** Ironwood card: the share crossed, its 7-day change, and the gate bar. */
export function progressCard(o: { kicker: string; path: string; question: string; value: string; pct: number; delta?: OgDelta; answer: string; dataThrough: string }) {
  return render(
    <Frame kicker={o.kicker} path={o.path} dataThrough={o.dataThrough}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Question text={o.question} size={qSize(o.question, 46)} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 28 }}>
          <div style={{ display: 'flex', fontSize: 120, lineHeight: 1, letterSpacing: -4, color: C.accent }}>{o.value}</div>
          {o.delta && <div style={{ display: 'flex', fontSize: 30, color: dColor(o.delta) }}>{o.delta.text}</div>}
        </div>
        <Answer text={o.answer} />
        <div style={{ display: 'flex', height: 22, marginTop: 10, borderRadius: 11, background: C.inset, border: `1px solid ${C.line}` }}>
          <div style={{ display: 'flex', width: `${Math.max(0, Math.min(100, o.pct))}%`, height: '100%', borderRadius: 11, background: C.accent }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, color: C.muted }}>
          {['0%', '25%', '50%', '75%', '100%'].map((t) => <div key={t} style={{ display: 'flex' }}>{t}</div>)}
        </div>
      </div>
    </Frame>,
  );
}

/** Privacy hub card: the shielded share, its change over a year, and the pools as one stacked bar. */
export function shareCard(o: { kicker: string; path: string; question: string; value: string; delta?: OgDelta; answer: string; parts: { label: string; value: number; color: string }[]; total: number; dataThrough: string }) {
  const total = o.total || 1; // shares of the whole supply; what the parts leave out (the lockbox) stays as bare track
  return render(
    <Frame kicker={o.kicker} path={o.path} dataThrough={o.dataThrough}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Question text={o.question} size={qSize(o.question, 46)} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 28 }}>
          <div style={{ display: 'flex', fontSize: 120, lineHeight: 1, letterSpacing: -4, color: C.value }}>{o.value}</div>
          {o.delta && <div style={{ display: 'flex', fontSize: 30, color: dColor(o.delta) }}>{o.delta.text}</div>}
        </div>
        <Answer text={o.answer} />
        <div style={{ display: 'flex', height: 22, marginTop: 10, borderRadius: 11, overflow: 'hidden', background: C.inset }}>
          {o.parts.map((p) => <div key={p.label} style={{ display: 'flex', width: `${(p.value / total) * 100}%`, height: '100%', background: p.color }} />)}
        </div>
        <div style={{ display: 'flex', gap: 28, fontSize: 18, color: C.text2 }}>
          {o.parts.map((p) => (
            <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', width: 14, height: 14, borderRadius: 3, background: p.color }} />
              <div style={{ display: 'flex' }}>{`${p.label} ${((p.value / total) * 100).toFixed(1)}%`}</div>
            </div>
          ))}
        </div>
      </div>
    </Frame>,
  );
}
