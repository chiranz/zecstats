'use client';

import Link from 'next/link';
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Spark } from '@/components/tools/Spark';
import { useWidth } from '@/components/tools/useWidth';
import { compact, dateLong, dateShort, num } from '@/lib/format';
import type { NewsCtx, NewsItem, NewsTheme, RawNews } from '@/lib/data/news';
import s from './news.module.css';
import { replaceQuery } from '@/components/tools/browser';

type FilterKey = 'all' | NewsTheme;
const FILTERS: { key: FilterKey; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'more' },
  { key: 'price', label: 'Price', icon: 'chart' },
  { key: 'ratio', label: 'ZEC/BTC', icon: 'compare' },
  { key: 'hashrate', label: 'Hashrate', icon: 'node' },
  { key: 'shielded', label: 'Shielded pool', icon: 'shield' },
  { key: 'flows', label: 'Pool flows', icon: 'arrow-right' },
  { key: 'tx', label: 'Activity', icon: 'clock' },
];
const THEME_LABEL: Record<NewsTheme, string> = { price: 'Price', ratio: 'ZEC/BTC', hashrate: 'Hashrate', shielded: 'Shielded pool', flows: 'Pool flows', tx: 'Activity', network: 'Weekly summary' };
const THEME_ICON: Record<NewsTheme, string> = { price: 'chart', ratio: 'compare', hashrate: 'node', shielded: 'shield', flows: 'arrow-right', tx: 'clock', network: 'globe' };
const CHART_NAME: Record<string, string> = { price: 'price', hashrate: 'hashrate', 'flow-ironwood': 'Ironwood flows', 'flow-orchard': 'Orchard flows', 'shielding-rate': 'shielding', 'tx-types': 'transaction types', tx: 'transactions' };

const DAY = 86400;
function ago(ref: number, ts: number): string {
  const d = ref - ts;
  if (d < 3600) return `${Math.max(1, Math.round(d / 60))} min ago`;
  if (d < DAY) return `${Math.round(d / 3600)} h ago`;
  if (d < 2 * DAY) return '1 day ago';
  if (d < 30 * DAY) return `${Math.floor(d / DAY)} days ago`;
  return dateLong(ts * 1000);
}
function bucketOf(ref: number, ts: number): string {
  const d = ref - ts;
  if (d < 3600) return 'Last hour';
  if (d < DAY) return 'Last 24 hours';
  if (d < 7 * DAY) return 'This week';
  if (d < 30 * DAY) return 'This month';
  return 'Earlier';
}

/** Colour every "▲ 1.7%" / "▼ 10.7%" in a headline; the arrow glyph always travels with the colour. */
function Moves({ text }: { text: string }) {
  const parts = text.split(/([▲▼] ?[\d.,]+%?(?: ZEC(?!\/))?)/g);
  return <>{parts.map((p, i) => (/^[▲▼]/.test(p) ? <span key={i} className={`mono ${p.startsWith('▲') ? 'up' : 'dn'}`} style={{ fontSize: '.95em' }}>{p}</span> : <Fragment key={i}>{p}</Fragment>))}</>;
}

const fmtCtx = (v: number, u: NewsCtx['unit'], axis = false) =>
  u === 'usd' ? (axis ? `$${compact(v, 1)}` : `$${num(v, v >= 1000 ? 2 : 2)}`) : u === 'btc' ? num(v, 5) : u === 'ghs' ? `${num(v, axis ? 0 : 2)}${axis ? '' : ' GH/s'}` : u === 'zec' ? `${compact(v, 1)}${axis ? '' : ' ZEC'}` : compact(v, 1);

function MiniChart({ ctx, label }: { ctx: NewsCtx; label: string }) {
  const [ref, w] = useWidth<HTMLDivElement>(560);
  const h = 150, m = { t: 12, r: w < 420 ? 64 : 92, b: 22, l: 48 };
  const iw = w - m.l - m.r, ih = h - m.t - m.b;
  const xs = ctx.values;
  const lo0 = Math.min(...xs, ctx.norm ? ctx.norm.mean - ctx.norm.sd : Infinity), hi0 = Math.max(...xs, ctx.norm ? ctx.norm.mean + ctx.norm.sd : -Infinity);
  const pad = (hi0 - lo0) * 0.12 || hi0 * 0.1 || 1;
  const lo = lo0 - pad < 0 && lo0 >= 0 ? 0 : lo0 - pad, hi = hi0 + pad;
  const x = (i: number) => (i / (xs.length - 1)) * iw;
  const y = (v: number) => ih - ((v - lo) / (hi - lo)) * ih;
  const d = xs.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const ticks = [lo + (hi - lo) * 0.15, lo + (hi - lo) * 0.5, lo + (hi - lo) * 0.85];
  const last = xs.at(-1)!;
  return (
    <div ref={ref} className={s.mini} role="img" aria-label={label}>
      <svg width={w} height={h} aria-hidden="true">
        <g transform={`translate(${m.l},${m.t})`}>
          {ticks.map((t) => (
            <g key={t}><line x1={0} x2={iw} y1={y(t)} y2={y(t)} stroke="var(--grid)" /><text x={-8} y={y(t)} dy="0.32em" textAnchor="end">{fmtCtx(t, ctx.unit, true)}</text></g>
          ))}
          {ctx.norm && (
            <>
              <rect x={0} width={iw} y={y(ctx.norm.mean + ctx.norm.sd)} height={Math.max(1, y(ctx.norm.mean - ctx.norm.sd) - y(ctx.norm.mean + ctx.norm.sd))} fill="var(--accent-wash)" />
              <line x1={0} x2={iw} y1={y(ctx.norm.mean)} y2={y(ctx.norm.mean)} stroke="var(--text-2)" strokeDasharray="4 4" />
              <text x={iw + 8} y={y(ctx.norm.mean) + 12}>norm {fmtCtx(ctx.norm.mean, ctx.unit, true)}</text>
            </>
          )}
          <path d={d} fill="none" stroke="var(--info)" strokeWidth={1.8} strokeLinejoin="round" />
          <circle cx={x(xs.length - 1)} cy={y(last)} r={3.5} fill="var(--info)" stroke="var(--card)" strokeWidth={1.5} />
          <text x={iw + 8} y={y(last)} dy="0.32em" style={{ fill: 'var(--value)', fontWeight: 600 }}>{fmtCtx(last, ctx.unit, true)}</text>
          <line x1={0} x2={iw} y1={ih} y2={ih} stroke="var(--axis)" />
          <text x={0} y={ih + 16}>{dateShort(ctx.from)}</text>
          <text x={iw} y={ih + 16} textAnchor="end">{dateShort(ctx.to)}</text>
        </g>
      </svg>
    </div>
  );
}

/** The card's anchor: /news#ev-<ts>-<k> (the ticker links here). A merged card answers to either of its keys. */
const anchorOf = (it: NewsItem) => `ev-${it.id.split('+')[0]}`;

function Card({ it, refTs, open, onToggle, target }: { it: NewsItem; refTs: number; open: boolean; onToggle: () => void; target: boolean }) {
  const bodyId = `evb-${it.id.split('+')[0]}`;
  const themes = it.merged ? 'Price · ZEC/BTC' : THEME_LABEL[it.theme];
  const chartName = CHART_NAME[it.chartHref.replace('/chart/', '')] ?? 'related';
  return (
    <article className={`${s.ev} ${open ? s.open : ''} ${target ? s.target : ''}`} id={anchorOf(it)}>
      <button type="button" className={s.evBtn} aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
        <span className={s.evIc} aria-hidden="true"><Icon name={THEME_ICON[it.theme]} size={15} /></span>
        <span className={s.evMain}>
          <span className={s.evMeta}>
            <span className={s.tag}>{themes}</span>
            <span className={`${s.sev} ${it.severity === 'major' ? s.major : ''}`}>{it.severity === 'major' ? 'Major' : 'Notable'}</span>
            {it.z ? <span className={s.sig}>{it.z > 0 ? '+' : '−'}{Math.abs(it.z).toFixed(1)}σ</span> : null}
            {it.merged ? <span className={s.merged}>{it.merged} events merged</span> : null}
          </span>
          <span className={s.evTitle}>{it.title ?? <Moves text={it.headline} />}</span>
          {it.lines && <span className={s.evLines}>{it.lines.map((l) => <span key={l}><Moves text={l} /></span>)}</span>}
        </span>
        <span className={s.evSide}>
          <time dateTime={new Date(it.ts * 1000).toISOString()}>{ago(refTs, it.ts)}</time>
          {it.ctx && <Spark values={it.ctx.values.slice(-15)} width={44} height={18} base={false} />}
        </span>
        <span className={s.chev} aria-hidden="true"><Icon name="chevron-down" size={16} /></span>
      </button>
      {open && (
        <div className={s.evBody} id={bodyId}>
          <p>{it.body}</p>
          {it.ctx && (
            <div className={s.evChart}>
              <MiniChart ctx={it.ctx} label={`${THEME_LABEL[it.theme]}: the 30 days up to ${dateLong(it.date)}${it.ctx.norm ? ', with the 30-day norm and a band of one standard deviation' : ''}`} />
            </div>
          )}
          <div className={s.evFoot}>
            <span className="small">{it.ctx ? `${it.ctx.norm ? 'Shaded band: within ±1σ of the 30-day norm · ' : ''}daily values, ${dateShort(it.ctx.from)} – ${dateLong(it.ctx.to)}` : dateLong(it.date)}</span>
            <Link href={it.chartHref}>Open {chartName} chart →</Link>
          </div>
        </div>
      )}
    </article>
  );
}

const PAGE = 18;

export function NewsFeed({ items: initial, refTs, nextBefore, nowCard, sigmaCard }: { items: NewsItem[]; refTs: number; nextBefore: number; nowCard: ReactNode; sigmaCard: ReactNode }) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [majorOnly, setMajorOnly] = useState(false);
  const [items, setItems] = useState(initial);
  const [shown, setShown] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(initial[0]?.id ?? null);
  const [before, setBefore] = useState<number | null>(nextBefore);
  const [loading, setLoading] = useState(false);

  // deep link: /news#ev-<ts>-<k> opens that card, clears filters that would hide it, and scrolls to it
  const [target, setTarget] = useState<string | null>(null);
  const [hit, setHit] = useState(0); // re-scroll when the same link is followed again
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => {
    const onHash = () => {
      const items = itemsRef.current;
      const key = /^#ev-(.+)$/.exec(decodeURIComponent(window.location.hash))?.[1];
      if (!key) return;
      const at = items.findIndex((it) => it.id.split('+').includes(key));
      if (at < 0) return;
      setFilter('all');
      setMajorOnly(false);
      setShown((n) => Math.max(n, at + 1));
      setOpenId(items[at].id);
      setTarget(items[at].id);
      setHit((n) => n + 1);
    };
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    if (!target) return;
    const it = itemsRef.current.find((x) => x.id === target);
    const el = it && document.getElementById(anchorOf(it));
    if (!el) return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
    el.querySelector('button')?.focus({ preventScroll: true });
  }, [target, hit]);

  // filters live in the URL so a filtered feed can be shared (?type=price&major=1)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.get('type') as FilterKey | null;
    if (t && FILTERS.some((f) => f.key === t)) setFilter(t);
    if (q.get('major') === '1') setMajorOnly(true);
  }, []);
  const sync = (f: FilterKey, m: boolean) => {
    const q = new URLSearchParams(window.location.search);
    if (f === 'all') q.delete('type'); else q.set('type', f);
    if (m) q.set('major', '1'); else q.delete('major');
    replaceQuery(q);
  };

  const matches = (it: NewsItem, f: FilterKey) => f === 'all' || it.theme === f || (!!it.merged && (f === 'price' || f === 'ratio'));
  const recent = items.filter((it) => refTs - it.ts < 30 * DAY);
  const counts = Object.fromEntries(FILTERS.map((f) => [f.key, recent.filter((it) => matches(it, f.key)).length])) as Record<FilterKey, number>;
  const majorCount = recent.filter((it) => matches(it, filter) && it.severity === 'major').length;

  const visible = items.filter((it) => matches(it, filter) && (!majorOnly || it.severity === 'major'));
  const page = visible.slice(0, shown);
  const groups: { name: string; aside: string; items: NewsItem[] }[] = [];
  for (const it of page) {
    const b = bucketOf(refTs, it.ts);
    const name = b === 'Earlier' ? `Earlier · ${new Date(it.ts * 1000).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}` : b;
    const g = groups.at(-1);
    if (g && g.name === name) g.items.push(it); else groups.push({ name, aside: '', items: [it] });
  }

  const loadMore = async () => {
    if (shown < visible.length) { setShown((n) => n + 12); return; }
    if (before == null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/news?before=${before}`);
      const body = (await res.json()) as RawNews;
      const oldest = items.at(-1)?.ts ?? Infinity;
      const older = body.items.filter((i) => !i.live && i.ts < oldest).map((i, k) => ({ id: `${i.ts}-o${k}`, ts: i.ts, date: i.date, theme: i.theme as NewsTheme, severity: i.severity, z: i.z, headline: i.headline, body: i.body, chartHref: `/chart/${i.chart_id}` }));
      if (older.length) { setItems((xs) => [...xs, ...older]); setShown((n) => n + 12); setBefore(body.next_before ?? null); }
      else setBefore(null);
    } catch { setBefore(null); } finally { setLoading(false); }
  };
  const canMore = shown < visible.length || before != null;
  const oldestShown = page.at(-1);

  return (
    <div className={s.news}>
      <div className={s.feed} aria-live="polite">
        {groups.length === 0 && <p className={s.empty}>No {majorOnly ? 'major ' : ''}{filter === 'all' ? '' : `${FILTERS.find((f) => f.key === filter)!.label.toLowerCase()} `}events in this stretch of the feed.</p>}
        {groups.map((g) => (
          <Fragment key={g.name}>
            <h2 className={s.bucket}>{g.name}<span className={s.c}>{g.items.length} event{g.items.length === 1 ? '' : 's'}</span></h2>
            {g.items.map((it) => <Card key={it.id} it={it} refTs={refTs} open={openId === it.id} target={target === it.id} onToggle={() => setOpenId((o) => (o === it.id ? null : it.id))} />)}
          </Fragment>
        ))}
        {canMore && <button type="button" className={`btn ${s.moreBtn}`} onClick={loadMore} disabled={loading}>{loading ? 'Loading…' : 'Load older events'}</button>}
        {oldestShown && <p className={s.end}>Showing events back to {dateLong(oldestShown.ts * 1000)}{canMore ? ' · the live feed covers 5+ years.' : ' · that is everything in this snapshot; the live feed covers 5+ years.'}</p>}
      </div>
      <aside className={s.rail} aria-label="Context and filters">
        {nowCard}
        <section className={`card ${s.filters}`} aria-labelledby="flt-h">
          <h2 className={s.railH} id="flt-h">Show · last 30 days</h2>
          <ul className={s.flist}>
            {FILTERS.map((f) => (
              <li key={f.key}>
                <button type="button" className={s.fbtn} aria-pressed={filter === f.key} onClick={() => { setFilter(f.key); setShown(PAGE); sync(f.key, majorOnly); }}>
                  <span className={s.fi} aria-hidden="true"><Icon name={f.icon} size={13} /></span>
                  {f.label}<span className={s.fn}>{counts[f.key]}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className={s.fFoot}>
            <div className="seg" role="group" aria-label="Severity">
              <button type="button" aria-pressed={!majorOnly} onClick={() => { setMajorOnly(false); sync(filter, false); }}>All</button>
              <button type="button" aria-pressed={majorOnly} onClick={() => { setMajorOnly(true); setShown(PAGE); sync(filter, true); }}>Major only<span>{majorCount}</span></button>
            </div>
            <p className="small">Filters are kept in the link.</p>
          </div>
        </section>
        {sigmaCard}
      </aside>
    </div>
  );
}
