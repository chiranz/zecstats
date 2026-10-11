'use client';

import { Suspense, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { scaleBand, scaleLinear } from 'd3-scale';
import s from './SwapAssets.module.css';
import { useWidth, r2 } from './shared';
import { formatValue } from '@/components/charts/valueFormat';
import { monthYear } from '@/lib/format';

// /chart/swap-assets: the live chart's three toggles — direction, window, grouping — with its URL keys
// (swap-dir / swap-window / swap-grouping, and the short aliases dir / mode / gran it also reads).

type Dir = 'out' | 'in' | 'net';
type Win = 'monthly' | 'all';
type Gran = 'token' | 'chain' | 'raw';
type View = { dir: Dir; win: Win; gran: Gran };
/** One grouping, rows ranked by all-time volume; outM / inM are per row, per month (USD). */
type Group = { labels: string[]; colors: (string | null)[]; out: number[]; in: number[]; outM: number[][]; inM: number[][] };
type Props = { months: string[]; through: string; groups: Record<Gran, Group> };

const DIRS: [Dir, string][] = [['out', 'ZEC → asset'], ['in', 'asset → ZEC'], ['net', 'Net']];
const WINS: [Win, string][] = [['monthly', 'Monthly'], ['all', 'All time']];
const GRANS: [Gran, string][] = [['token', 'Token'], ['chain', 'Chain'], ['raw', 'Asset']];
const KEYS = { dir: ['swap-dir', 'dir'], win: ['swap-window', 'mode'], gran: ['swap-grouping', 'gran'] } as const;
const DEFAULT: View = { dir: 'out', win: 'monthly', gran: 'token' };
const NOUN: Record<Gran, string> = { token: 'tokens', chain: 'chains', raw: 'assets' };
const SPARE = ['var(--s2)', 'var(--s3)', 'var(--s5)', 'var(--s1)', 'var(--btc)'];
const OTHER = 'var(--s6)';

const usdC = (v: number) => formatValue(v, 'usdCompact');
const arrow = (v: number) => <span className={v >= 0 ? 'up' : 'dn'}>{v >= 0 ? '▲' : '▼'} {usdC(Math.abs(v))}</span>;
const monthLong = (m: string) => monthYear(m).replace(/'(\d\d)$/, '20$1');

function readView(q: { get(k: string): string | null }): View {
  const pick = <T extends string>(k: readonly [string, string], opts: [T, string][], d: T): T => {
    const v = q.get(k[0]) ?? q.get(k[1]);
    return opts.some(([o]) => o === v) ? (v as T) : d;
  };
  return { dir: pick(KEYS.dir, DIRS, DEFAULT.dir), win: pick(KEYS.win, WINS, DEFAULT.win), gran: pick(KEYS.gran, GRANS, DEFAULT.gran) };
}

/** Semantic colours first (BTC orange, USD blue…), then unused generic hues: never two rows the same colour. */
function palette(idx: number[], colors: (string | null)[]) {
  const used = new Set<string>(), out = new Map<number, string>();
  for (const i of idx) { const c = colors[i]; if (c && !used.has(c)) { out.set(i, c); used.add(c); } }
  for (const i of idx) if (!out.has(i)) { const c = SPARE.find((x) => !used.has(x)) ?? OTHER; out.set(i, c); used.add(c); }
  return out;
}

export function SwapAssets(props: Record<string, unknown>) {
  const p = props as Props;
  // The page is prerendered: the fallback is the default view, replaced by the URL's view on hydration.
  return <Suspense fallback={<Panel {...p} view={DEFAULT} />}><Routed {...p} /></Suspense>;
}

function Routed(p: Props) {
  const q = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [local, setLocal] = useState<View | null>(null);
  const [, start] = useTransition();
  const view = local ?? readView(q);
  const change = (k: keyof View, v: string) => {
    setLocal({ ...view, [k]: v });
    const u = new URLSearchParams(window.location.search);
    u.set(KEYS[k][0], v);
    u.delete(KEYS[k][1]);
    start(() => router.replace(`${pathname}?${u}`, { scroll: false }));
  };
  return <Panel {...p} view={view} onChange={change} />;
}

function Panel({ months, groups, view, onChange }: Props & { view: View; onChange?: (k: keyof View, v: string) => void }) {
  const [share, setShare] = useState(false);
  const g = groups[view.gran];
  const { dir, win, gran } = view;

  const m = useMemo(() => {
    const idx = g.labels.map((_, i) => i);
    const tot = idx.map((i) => (dir === 'out' ? g.out[i] : dir === 'in' ? g.in[i] : g.in[i] - g.out[i]));
    const ranked = idx.filter((i) => tot[i] !== 0).sort((a, b) => (dir === 'net' ? Math.abs(tot[b]) - Math.abs(tot[a]) : tot[b] - tot[a]));
    const top = ranked.slice(0, 4);
    const col = palette(top, g.colors);
    const monthly = idx.map((i) => months.map((_, j) => (dir === 'out' ? g.outM[i][j] : dir === 'in' ? g.inM[i][j] : g.inM[i][j] - g.outM[i][j])));
    const rest = idx.filter((i) => !top.includes(i));
    const other = months.map((_, j) => rest.reduce((a, i) => a + monthly[i][j], 0));
    const series = top.map((i) => ({ key: g.labels[i], label: g.labels[i], color: col.get(i)!, values: monthly[i] }));
    if (other.some((v) => v !== 0)) series.push({ key: '_other', label: 'Other', color: OTHER, values: other });
    return { idx, tot, ranked, col, series, total: tot.reduce((a, v) => a + v, 0) };
  }, [g, dir, months]);

  const cap = gran === 'raw' ? 16 : 12;
  const noun = NOUN[gran];
  const lead = m.ranked[0];
  const leadLabel = lead != null ? g.labels[lead] : '—';
  const lastM = months.length - 1;
  const monthTotal = m.series.reduce((a, q) => a + q.values[lastM], 0);
  const monthLead = m.series.filter((q) => q.key !== '_other').sort((a, b) => Math.abs(b.values[lastM]) - Math.abs(a.values[lastM]))[0];

  let takeaway;
  if (win === 'all' && dir === 'out') takeaway = <><b>{leadLabel}</b> took <b>{((m.tot[lead] / m.total) * 100).toFixed(0)}%</b> of the {usdC(m.total)} of ZEC swapped out, all time.</>;
  else if (win === 'all' && dir === 'in') takeaway = <><b>{leadLabel}</b> supplied <b>{((m.tot[lead] / m.total) * 100).toFixed(0)}%</b> of the {usdC(m.total)} swapped into ZEC, all time.</>;
  else if (win === 'all') takeaway = <>All time, net flow into ZEC across every asset is <b>{arrow(m.total)}</b>; the biggest single net is {leadLabel} at <b>{arrow(m.tot[lead])}</b>.</>;
  else if (dir === 'net') takeaway = <>In {monthLong(months[lastM])}, net flow into ZEC was <b>{arrow(monthTotal)}</b>{monthLead ? <>, led by {monthLead.label} at <b>{arrow(monthLead.values[lastM])}</b></> : null}.</>;
  else takeaway = <>In {monthLong(months[lastM])}, <b>{usdC(monthTotal)}</b> was swapped {dir === 'out' ? 'out of' : 'into'} ZEC{monthLead && monthTotal ? <>; <b>{monthLead.label}</b> was {((monthLead.values[lastM] / monthTotal) * 100).toFixed(0)}% of it</> : null}.</>;

  const seg = <T extends string>(id: string, label: string, k: keyof View, opts: [T, string][], cur: T) => (
    <div className={s.grp}>
      <span className={s.glbl} id={id}>{label}</span>
      <div className="seg" role="group" aria-labelledby={id}>
        {opts.map(([v, l]) => <button key={v} type="button" aria-pressed={cur === v} onClick={() => onChange?.(k, v)}>{l}</button>)}
      </div>
    </div>
  );

  const showShare = win === 'monthly' && dir !== 'net';
  const dirWords = dir === 'out' ? 'ZEC swapped into each asset' : dir === 'in' ? 'each asset swapped into ZEC' : 'net flow into ZEC';

  return (
    <div className={s.root}>
      <div className={s.ctl} role="region" aria-label="View">
        {seg('sa-dir', 'Direction', 'dir', DIRS, dir)}
        {seg('sa-win', 'Window', 'win', WINS, win)}
        {seg('sa-gran', 'Group by', 'gran', GRANS, gran)}
        {showShare && (
          <div className={s.grp}>
            <span className={s.glbl} id="sa-unit">Units</span>
            <div className="seg" role="group" aria-labelledby="sa-unit">
              <button type="button" aria-pressed={!share} onClick={() => setShare(false)}>USD</button>
              <button type="button" aria-pressed={share} onClick={() => setShare(true)}>Share %</button>
            </div>
          </div>
        )}
      </div>
      <p className={s.take}>{takeaway}</p>

      {win === 'monthly' ? (
        <>
          <div className={s.legend} aria-hidden="true">
            {m.series.map((q) => <span key={q.key}><b style={{ background: q.color }} />{q.label}</span>)}
            <span className="muted">· top 4 {noun} by {dir === 'net' ? 'size of net flow' : 'volume'}{dir === 'net' ? ' · inflow above zero, outflow below' : ''}</span>
          </div>
          <Monthly
            months={months} series={m.series} share={showShare && share} net={dir === 'net'}
            ariaLabel={`${dirWords} by month, ${monthYear(months[0])} to ${monthYear(months[lastM])}, top 4 ${noun} and other; ${monthLong(months[lastM])} total ${usdC(monthTotal)}.`}
          />
        </>
      ) : dir === 'net' ? (
        <>
          <div className={s.legend} aria-hidden="true">
            <span><b style={{ background: 'var(--s4)' }} />ZEC → asset</span>
            <span><b style={{ background: 'var(--s2)' }} />asset → ZEC</span>
            <span><span style={{ color: 'var(--value)' }}>◆</span>net</span>
          </div>
          <Ranked
            diverging
            rows={m.idx.filter((i) => g.out[i] + g.in[i] > 0).sort((a, b) => g.out[b] + g.in[b] - (g.out[a] + g.in[a])).slice(0, cap).map((i) => ({ label: g.labels[i], left: g.out[i], right: g.in[i] }))}
            ariaLabel={`All-time NEAR Intents swap volume by ${noun.slice(0, -1)}, top ${cap}: ZEC swapped out to the left, into ZEC to the right, net marked; net flow into ZEC ${usdC(m.total)}.`}
          />
        </>
      ) : (
        <Ranked
          diverging={false}
          rows={m.ranked.slice(0, cap).map((i) => ({ label: g.labels[i], value: m.tot[i], color: m.col.get(i) ?? OTHER }))}
          ariaLabel={`All-time ${dirWords} by ${noun.slice(0, -1)}, top ${cap}: ${m.ranked.slice(0, 3).map((i) => `${g.labels[i]} ${usdC(m.tot[i])}`).join(', ')}.`}
        />
      )}
    </div>
  );
}

type Row = { label: string; value?: number; left?: number; right?: number; color?: string };

/** Horizontal ranked bars; diverging = ZEC → asset left of zero, asset → ZEC right, ◆ at the net. */
function Ranked({ rows, diverging, ariaLabel }: { rows: Row[]; diverging: boolean; ariaLabel: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const narrow = width < 520;
  const rh = 24, gap = 6;
  const chars = Math.max(4, ...rows.map((r) => r.label.length));
  const labelW = Math.min(narrow ? 92 : 132, Math.round(chars * 7.3) + 12);
  const valueW = diverging ? (narrow ? 78 : 86) : (narrow ? 64 : 76);
  const top = diverging ? 22 : 4;
  const plotH = rows.length * (rh + gap);
  const h = top + plotH + 20;
  const iw = Math.max(60, width - labelW - valueW - 8);
  const fit = (t: string) => { const max = Math.floor((labelW - 12) / 7.3); return t.length > max ? `${t.slice(0, max - 1)}…` : t; };

  const max = Math.max(1, ...rows.flatMap((r) => (diverging ? [r.left ?? 0, r.right ?? 0] : [r.value ?? 0])));
  const xs = diverging ? scaleLinear().domain([-max, max]).range([0, iw]).nice() : scaleLinear().domain([0, max]).range([0, iw]).nice();
  const x = (v: number) => r2(xs(v));
  const ticks = xs.ticks(narrow ? 4 : 6);

  return (
    <div ref={ref} className={s.plot} role="img" aria-label={ariaLabel}>
      <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} aria-hidden="true" data-export="">
        <g transform={`translate(${labelW},${top})`}>
          {diverging && <>
            <text x={x(0) - 8} y={-8} textAnchor="end" className={s.name}>◀ ZEC → asset</text>
            <text x={x(0) + 8} y={-8} className={s.name}>asset → ZEC ▶</text>
          </>}
          {ticks.map((t) => <g key={t}><line className="gl" x1={x(t)} x2={x(t)} y1={0} y2={plotH} /><text x={x(t)} y={plotH + 14} textAnchor="middle">{formatValue(Math.abs(t), 'usdCompact', true)}</text></g>)}
          <line className="ax" x1={x(0)} x2={x(0)} y1={diverging ? -2 : 0} y2={plotH} />
          {rows.map((r, i) => {
            const yy = i * (rh + gap), cy = yy + rh / 2;
            if (!diverging) {
              const v = r.value ?? 0;
              return (
                <g key={r.label}>
                  <title>{`${r.label}: ${usdC(v)}`}</title>
                  <text x={-8} y={cy} dy="0.32em" textAnchor="end" className={s.name}>{fit(r.label)}</text>
                  <rect x={x(0)} y={yy + 2} width={Math.max(1, x(v) - x(0))} height={rh - 4} rx={3} fill={r.color ?? OTHER} />
                  <text x={iw + 8} y={cy} dy="0.32em" className={s.val}>{usdC(v)}</text>
                </g>
              );
            }
            const L = r.left ?? 0, R = r.right ?? 0, net = R - L, nx = x(net);
            return (
              <g key={r.label}>
                <title>{`${r.label}: ZEC → asset ${usdC(L)} · asset → ZEC ${usdC(R)} · net ${net >= 0 ? '▲ ' : '▼ '}${usdC(Math.abs(net))}`}</title>
                <text x={-8} y={cy} dy="0.32em" textAnchor="end" className={s.name}>{fit(r.label)}</text>
                <rect x={x(-L)} y={yy + 3} width={Math.max(0, x(0) - x(-L))} height={rh - 6} rx={2} fill="var(--s4)" opacity={0.85} />
                <rect x={x(0)} y={yy + 3} width={Math.max(0, x(R) - x(0))} height={rh - 6} rx={2} fill="var(--s2)" opacity={0.85} />
                <path d={`M${nx} ${cy - 6} L${nx + 6} ${cy} L${nx} ${cy + 6} L${nx - 6} ${cy} Z`} fill="var(--value)" stroke="var(--card)" strokeWidth={1} />
                <text x={iw + 8} y={cy} dy="0.32em" className={s.val}>{net >= 0 ? '▲' : '▼'} {formatValue(Math.abs(net), 'usdCompact', true)}</text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

type Col = { key: string; label: string; color: string; values: number[] };

/** Monthly columns, stacked; negative values stack downward from zero (net view). */
function Monthly({ months, series, share, net, ariaLabel }: { months: string[]; series: Col[]; share: boolean; net: boolean; ariaLabel: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const narrow = width < 520;
  const mg = { top: 12, right: 12, bottom: 28, left: narrow ? 50 : 62 };
  const h = narrow ? 260 : 320;
  const iw = width - mg.left - mg.right, ih = h - mg.top - mg.bottom;

  const stacks = useMemo(() => months.map((_, j) => {
    const tot = series.reduce((a, q) => a + Math.max(0, q.values[j]), 0);
    let pos = 0, neg = 0;
    return series.map((q) => {
      const v = share ? (tot ? (q.values[j] / tot) * 100 : 0) : q.values[j];
      if (v >= 0) { const r: [number, number] = [pos, pos + v]; pos += v; return r; }
      const r: [number, number] = [neg + v, neg]; neg += v; return r;
    });
  }), [months, series, share]);

  const flat = stacks.flat();
  const lo = share ? 0 : Math.min(0, ...flat.map((r) => r[0])), hi = share ? 100 : Math.max(0, ...flat.map((r) => r[1]));
  const ys = scaleLinear().domain([lo, hi || 1]).range([ih, 0]);
  if (!share) ys.nice(5);
  const y = (v: number) => r2(ys(v));
  const xb = scaleBand<number>().domain(months.map((_, i) => i)).range([0, iw]).paddingInner(0.2).paddingOuter(0.1);
  const bw = r2(xb.bandwidth());
  const cx = (i: number) => r2((xb(i) ?? 0) + xb.bandwidth() / 2);
  const every = Math.max(1, Math.ceil(months.length / Math.max(2, Math.floor(iw / (narrow ? 72 : 64)))));
  const fmt = (v: number, axis = false) => formatValue(v, share ? 'pct0' : 'usdCompact', axis);

  const onMove = (clientX: number) => {
    const el = ref.current;
    if (!el || !months.length) return;
    const px = clientX - el.getBoundingClientRect().left - mg.left;
    let best = 0, bd = Infinity;
    months.forEach((_, i) => { const d = Math.abs(cx(i) - px); if (d < bd) { bd = d; best = i; } });
    setHover(best);
  };
  const hi2 = hover != null && hover < months.length ? hover : null;
  const tipLeft = hi2 != null ? Math.min(Math.max(0, cx(hi2) + mg.left + 14), width - 210) : 0;
  const flip = hi2 != null && cx(hi2) + mg.left + 230 > width;

  return (
    <div
      ref={ref} className={s.plot} style={{ height: h, touchAction: 'pan-y' }} tabIndex={0} role="img" aria-label={ariaLabel}
      onPointerMove={(e) => onMove(e.clientX)} onPointerLeave={() => setHover(null)} onBlur={() => setHover(null)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); setHover((v) => Math.max(0, (v ?? months.length) - 1)); }
        if (e.key === 'ArrowRight') { e.preventDefault(); setHover((v) => Math.min(months.length - 1, (v ?? -1) + 1)); }
        if (e.key === 'Escape') setHover(null);
      }}
    >
      <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} aria-hidden="true" data-export="">
        <g transform={`translate(${mg.left},${mg.top})`}>
          {(share ? [0, 25, 50, 75, 100] : ys.ticks(narrow ? 4 : 5)).map((t) => (
            <g key={t}><line className="gl" x1={0} x2={iw} y1={y(t)} y2={y(t)} /><text x={-10} y={y(t)} dy="0.32em" textAnchor="end">{fmt(t, true)}</text></g>
          ))}
          {months.map((mo, i) => (i % every === 0 ? <text key={mo} x={cx(i)} y={ih + 18} textAnchor="middle">{monthYear(mo)}</text> : null))}
          {series.map((q, k) => (
            <g key={q.key} fill={q.color}>
              {stacks.map((st, i) => {
                const [a, b] = st[k];
                if (a === b) return null;
                return <rect key={i} x={r2(xb(i) ?? 0)} y={y(b)} width={bw} height={Math.max(0.5, y(a) - y(b))} rx={bw > 6 ? 1.5 : 0} opacity={hi2 != null && hi2 !== i ? 0.55 : 1} />;
              })}
            </g>
          ))}
          <line className="ax" x1={0} x2={iw} y1={y(0)} y2={y(0)} />
        </g>
      </svg>
      {hi2 != null && (
        <div className="tip" style={{ top: 8, left: flip ? undefined : tipLeft, right: flip ? width - (cx(hi2) + mg.left) + 14 : undefined, pointerEvents: 'none' }}>
          <b>{monthLong(months[hi2])}</b>
          {series.map((q, k) => (
            <span key={q.key} className={s.tipRow}>
              <i className="sw" style={{ background: q.color }} />
              <span>{q.label}</span>
              <b>{share ? fmt(stacks[hi2][k][1] - stacks[hi2][k][0]) : net ? <>{q.values[hi2] >= 0 ? '▲' : '▼'} {usdC(Math.abs(q.values[hi2]))}</> : usdC(q.values[hi2])}</b>
            </span>
          ))}
          {!share && (
            <span className={`${s.tipRow} ${s.tipTotal}`}>
              <i /><span>{net ? 'Net' : 'Total'}</span>
              <b>{(() => { const t = series.reduce((a, q) => a + q.values[hi2], 0); return net ? <>{t >= 0 ? '▲' : '▼'} {usdC(Math.abs(t))}</> : usdC(t); })()}</b>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
