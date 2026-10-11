'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/Icon';
import type { SearchItem } from '@/lib/search';
import type { Ctx, Item, NavData } from './types';
import s from './navlab.module.css';

/* ---------- glyphs the shared Icon set lacks (kept local so shared files stay untouched) ---------- */
const EXTRA: Record<string, string> = {
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  news: 'M5 5h11v14H5zM16 9h3v8a2 2 0 0 1-2 2H7M8 9h5M8 12h5M8 15h3',
  'chevron-left': 'M15 6l-6 6 6 6',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  hash: 'M5 9h14M5 15h14M10 4 8 20M16 4l-2 16',
};
export function Glyph({ name, size = 16 }: { name: string; size?: number }) {
  if (!EXTRA[name]) return <Icon name={name} size={size} />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={EXTRA[name]} />
    </svg>
  );
}

/* ---------- stage context: ticker toggle + a portal target so overlays stay inside the frame ---------- */
type StageCtx = { ticker: boolean; portal: HTMLElement | null; phone: boolean };
const StageContext = createContext<StageCtx>({ ticker: true, portal: null, phone: false });
export const useStage = () => useContext(StageContext);

/** A framed preview: label row (route, measured H1/answer offsets, ticker toggle) + an isolated viewport. */
export function Stage({ label, path, phone = false, children }: { label: string; path: string; phone?: boolean; children: ReactNode }) {
  const [ticker, setTicker] = useState(true);
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [m, setM] = useState<{ h1: number; ans: number } | null>(null);

  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const measure = () => {
      const top = sc.getBoundingClientRect().top - sc.scrollTop;
      const h1 = sc.querySelector('[data-nl-h1]');
      const ans = sc.querySelector('[data-nl-answer]');
      if (h1 && ans) setM({ h1: Math.round(h1.getBoundingClientRect().top - top), ans: Math.round(ans.getBoundingClientRect().top - top) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(sc);
    if (sc.firstElementChild) ro.observe(sc.firstElementChild);
    return () => ro.disconnect();
  }, [ticker]);

  return (
    <figure className={`${s.stage} ${phone ? s.phone : ''}`}>
      <figcaption className={s.stageBar}>
        <span className={s.stageLabel}>{label}</span>
        <code className={s.stagePath}>{path}</code>
        {m && <span className={s.measure} title="Distance from the top of the window, in this frame">H1 {m.h1}px · answer {m.ans}px</span>}
        <button type="button" className={s.toggle} aria-pressed={ticker} onClick={() => setTicker((t) => !t)}>Ticker slot</button>
      </figcaption>
      <div className={s.viewport} ref={setPortal}>
        <div className={s.scroller} ref={scrollRef} data-nl-scroller>
          <StageContext.Provider value={{ ticker, portal, phone }}>{children}</StageContext.Provider>
        </div>
      </div>
    </figure>
  );
}

export function TickerSlot() {
  const { ticker } = useStage();
  if (!ticker) return null;
  return (
    <div className={s.ticker} role="note" aria-label="Reserved slot for the news and events ticker">
      <span className={s.tickerTag}>Ticker slot</span>
      <span>~36px news &amp; events strip · designed separately · optional per page</span>
    </div>
  );
}

/* ---------- disclosure: button + panel; Escape and outside click close; focus returns to the button ---------- */
export function useDisclosure() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); } };
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);
  const wrap = {
    ref: wrapRef,
    onBlur: (e: React.FocusEvent) => { if (open && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); },
  };
  const button = { ref: btnRef, type: 'button' as const, 'aria-expanded': open, 'aria-controls': id, onClick: () => setOpen((o) => !o) };
  return { open, setOpen, id, wrap, button, btnRef };
}

/* ---------- modal sheet / dialog, rendered into the stage frame ---------- */
export function Sheet({ open, onClose, label, children, className, returnRef }: { open: boolean; onClose: () => void; label: string; children: ReactNode; className?: string; returnRef?: RefObject<HTMLElement | null> }) {
  const { portal } = useStage();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;
    (el.querySelector<HTMLElement>('[data-autofocus]') ?? el.querySelector<HTMLElement>('input,button,a'))?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); }
      if (e.key === 'Tab') {
        const f = [...el.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input')].filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1)!.focus(); }
        else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
      }
    };
    el.addEventListener('keydown', onKey);
    const back = returnRef?.current;
    return () => { el.removeEventListener('keydown', onKey); back?.focus(); };
  }, [open, returnRef]);
  if (!open || !portal) return null;
  return createPortal(
    <div className={`${s.scrim} ${className ?? ''}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label={label} ref={ref}>{children}</div>
    </div>,
    portal,
  );
}

/* ---------- search: the real index (lib/data/search-index.ts), same scoring as the live palette ---------- */
const RECENT_KEY = 'navlab-recent';
function readRecent(): string[] { try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; } }
function remember(href: string) { try { localStorage.setItem(RECENT_KEY, JSON.stringify([href, ...readRecent().filter((h) => h !== href)].slice(0, 4))); } catch {} }

type Row = { href: string; title: string; desc?: string; kind: SearchItem['kind'] | 'Recent' | 'Popular'; group?: string; value?: string };

export function useResults(data: NavData, q: string, scope: SearchItem['kind'] | null) {
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => setRecent(readRecent()), [q]);
  return useMemo(() => {
    const t = q.trim().toLowerCase();
    const pool = scope ? data.search.filter((i) => i.kind === scope) : data.search;
    const toRow = (i: SearchItem, kind: Row['kind'] = i.kind): Row => ({ href: i.href, title: i.title, desc: i.desc, kind, group: i.group, value: data.values[i.href] });
    if (!t) {
      if (scope) return groupRows(pool.map((i) => toRow(i)), (r) => r.group ?? r.kind);
      const rec = recent.map((h) => data.search.find((i) => i.href === h)).filter(Boolean).map((i) => toRow(i!, 'Recent'));
      const pop = data.popular.filter((p) => !recent.includes(p.href)).map<Row>((p) => ({ href: p.href, title: p.label, kind: 'Popular', group: p.desc, value: p.value }));
      return groupRows([...rec, ...pop], (r) => (r.kind === 'Recent' ? 'Recent' : 'Popular'));
    }
    const words = t.split(/\s+/);
    const hits = pool
      .map((i) => {
        const hay = `${i.title} ${i.desc ?? ''} ${i.keywords ?? ''} ${i.group ?? ''}`.toLowerCase();
        if (!words.every((w) => hay.includes(w))) return null;
        return { i, score: (i.title.toLowerCase().startsWith(t) ? 3 : 0) + (i.title.toLowerCase().includes(t) ? 2 : 0) + (i.kind === 'Page' ? 0.5 : 0) };
      })
      .filter((x): x is { i: SearchItem; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((x) => toRow(x.i));
    return groupRows(hits, (r) => ({ Page: 'Pages', Chart: 'Charts', Tool: 'Tools' } as Record<string, string>)[r.kind] ?? r.kind);
  }, [q, scope, data, recent]);
}
function groupRows(rows: Row[], key: (r: Row) => string) {
  const out: { name: string; rows: Row[] }[] = [];
  for (const r of rows) { const k = key(r); const g = out.find((x) => x.name === k); if (g) g.rows.push(r); else out.push({ name: k, rows: [r] }); }
  return out;
}

function Highlight({ text, q }: { text: string; q: string }) {
  const t = q.trim();
  const i = t ? text.toLowerCase().indexOf(t.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className={s.mark}>{text.slice(i, i + t.length)}</mark>{text.slice(i + t.length)}</>;
}

const TRY = ['ironwood', 'price', 'fees', 'halving', 'cost basis'];

/**
 * Combobox search (ARIA 1.2 pattern): input role=combobox, popup role=listbox with grouped options,
 * ↑/↓ move, Enter opens, Escape closes (then clears). Results are real pages.
 */
export function SearchBox({ data, placeholder, label = 'Search charts, tools and pages', size = 'md', scope = null, onScopeClear, autoFocus = false, alwaysOpen = false, onNavigate, inputRef, popClass }: {
  data: NavData; placeholder?: string; label?: string; size?: 'sm' | 'md' | 'lg'; scope?: SearchItem['kind'] | null; onScopeClear?: () => void;
  autoFocus?: boolean; alwaysOpen?: boolean; onNavigate?: () => void; inputRef?: RefObject<HTMLInputElement | null>; popClass?: string;
}) {
  const router = useRouter();
  const id = useId();
  const [q, setQ] = useState('');
  const [openState, setOpen] = useState(false);
  const open = alwaysOpen || openState || !!scope;
  const [sel, setSel] = useState(0);
  const groups = useResults(data, q, scope);
  const flat = groups.flatMap((g) => g.rows);
  const own = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? own;
  useEffect(() => setSel(0), [q, scope]);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus, ref]);
  useEffect(() => { if (scope) ref.current?.focus(); }, [scope, ref]);
  const go = (href: string) => { remember(href); setOpen(false); onNavigate?.(); router.push(href); };
  const opt = (i: number) => `${id}-o${i}`;

  return (
    <div className={`${s.sb} ${s[size]}`} onBlur={(e) => { if (!alwaysOpen && !e.currentTarget.contains(e.relatedTarget as Node)) { setOpen(false); if (scope) onScopeClear?.(); } }}>
      <div className={s.sbField}>
        <Icon name="search" size={size === 'lg' ? 17 : 15} />
        {scope && (
          <button type="button" className={s.scope} onClick={() => { onScopeClear?.(); ref.current?.focus(); }} aria-label={`Remove filter: ${scope}s`}>
            in: {scope.toLowerCase()}s <Icon name="x" size={11} />
          </button>
        )}
        <input
          ref={ref}
          type="search"
          data-shot="field"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={`${id}-lb`}
          aria-autocomplete="list"
          aria-activedescendant={open && flat[sel] ? opt(sel) : undefined}
          placeholder={placeholder ?? `Search ${data.counts.charts} charts & ${data.counts.tools} tools`}
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setSel((x) => Math.min(flat.length - 1, x + 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((x) => Math.max(0, x - 1)); }
            else if (e.key === 'Enter' && open && flat[sel]) { e.preventDefault(); go(flat[sel].href); }
            else if (e.key === 'Escape') {
              if (open && !alwaysOpen) { e.stopPropagation(); setOpen(false); if (scope) onScopeClear?.(); } else if (q) { e.stopPropagation(); setQ(''); }
            }
          }}
        />
        {size !== 'sm' && <span className="kbd" aria-hidden="true">⌘K</span>}
      </div>
      {open && (
        <div className={`${s.pop} ${popClass ?? ''}`}>
          <div role="listbox" id={`${id}-lb`} aria-label="Results" className={s.lb}>
            {groups.map((g) => (
              <div role="group" aria-labelledby={`${id}-${g.name}`} key={g.name}>
                <div className={s.lbH} id={`${id}-${g.name}`} role="presentation">{g.name}</div>
                {g.rows.map((r) => {
                  const i = flat.indexOf(r);
                  return (
                    <div role="option" id={opt(i)} aria-selected={i === sel} key={`${g.name}${r.href}`} className={s.opt}
                      onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setSel(i)} onClick={() => go(r.href)}>
                      <span className={s.optIc} aria-hidden="true"><Glyph name={r.kind === 'Chart' || r.href.startsWith('/chart/') ? 'chart' : r.kind === 'Tool' ? 'tool' : r.kind === 'Recent' ? 'clock' : 'page'} size={13} /></span>
                      <span className={s.optT}><b><Highlight text={r.title} q={q} /></b>{(r.desc || r.group) && <small>{r.desc ?? r.group}</small>}</span>
                      {r.value && <span className={s.optV}>{r.value}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
            {q && !flat.length && <p className={s.empty}>No matches for “{q}”.</p>}
          </div>
          <div className={s.popFoot}>
            {!q && !scope ? (
              <span className={s.try}>Try {TRY.map((t) => <button type="button" className="chip" key={t} onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(t); ref.current?.focus(); }}>{t}</button>)}</span>
            ) : (
              <span className={s.keys}><span className="kbd">↑</span><span className="kbd">↓</span> move · <span className="kbd">Enter</span> open · <span className="kbd">Esc</span> close</span>
            )}
            <span className={s.count}>{flat.length} of {data.search.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Icon button that opens search as a dialog inside the frame (phones, and C/E on desktop). */
export function SearchButton({ data, className, label = 'Search' }: { data: NavData; className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button ref={ref} type="button" className={`btn icon ${className ?? ''}`} aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} data-shot="search"><Icon name="search" size={16} /></button>
      <Sheet open={open} onClose={close} label="Search" returnRef={ref} className={s.searchScrim}>
        <div className={s.dlgHead}><span className="kicker">Search</span><button type="button" className="btn icon ghost" aria-label="Close search" onClick={close}><Icon name="x" size={16} /></button></div>
        <SearchBox data={data} size="lg" autoFocus alwaysOpen onNavigate={close} popClass={s.popInline} />
      </Sheet>
    </>
  );
}

/* ---------- status: node + freshness, said once, in the bar ---------- */
export function StatusPill({ data, cadence, variant = 'pill' }: { data: NavData; cadence: string; variant?: 'pill' | 'dot' | 'line' }) {
  const d = useDisclosure();
  const f = data.fresh;
  return (
    <div className={s.statusWrap} {...d.wrap}>
      <button {...d.button} className={`${s.status} ${s[variant]}`} aria-label={variant === 'dot' ? `Node ${f.synced ? 'synced' : 'catching up'}, data through ${f.through}. Details` : undefined} data-shot="status">
        <i className={s.liveDot} aria-hidden="true" />
        {variant === 'pill' && <span className={s.statusTxt}><span className={s.hideMid}>{f.synced ? 'synced' : 'syncing'} · block <span className="num">{f.height}</span> · </span>data through {f.throughShort}</span>}
        {variant === 'line' && <span className={s.statusTxt}>{f.synced ? 'Synced' : 'Syncing'} · block <span className="num">{f.height}</span> · data through {f.through}</span>}
      </button>
      {d.open && (
        <div id={d.id} className={s.statusPop} role="region" aria-label="Data freshness">
          <dl>
            <div><dt>Node</dt><dd><i className={s.liveDot} aria-hidden="true" /> {f.synced ? 'Synced' : 'Catching up'} · {f.node}</dd></div>
            <div><dt>Block</dt><dd className="num">{f.height}</dd></div>
            <div><dt>Data through</dt><dd>{f.through} · complete UTC days</dd></div>
            <div><dt>This page</dt><dd>{cadence}</dd></div>
          </dl>
          <p className={s.concept}>Redesign concept · figures from a zecstats.com snapshot, {f.captured}</p>
          <Link href="/node" className={s.popLink}>Node status <Icon name="arrow-right" size={12} /></Link>
        </div>
      )}
    </div>
  );
}

/* ---------- page-header and answer stubs (the real page's opening, simplified) ---------- */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return <>{parts.map((p, i) => (i % 2 ? <b key={i}>{p}</b> : p))}</>;
}
export function chartLede(data: NavData) {
  const { lede, value } = data.chart;
  return lede.includes('**') || !lede.includes(value) ? lede : lede.replace(value, `**${value}**`);
}

export function PrivacyAnswer({ data }: { data: NavData }) {
  const p = data.privacyPage;
  return (
    <section className={`hero ${s.ans}`} data-nl-answer aria-label="Shielded share of supply (preview)">
      <div className={s.ansRow}>
        <div className={s.ansFig}>
          <span className="kicker">Shielded share of all ZEC · {p.date}</span>
          <div className={`figure num ${s.fig}`}>{p.shieldedPct}<small>%</small></div>
          <p className={s.ansSub}><b>{p.shieldedZec}</b> shielded · <b>{p.shieldedUsd}</b></p>
        </div>
        <div className={s.ansPools}>
          <span className="kicker">Where all ZEC sits, by pool</span>
          <div className={s.stack} role="img" aria-label={p.pools.map((x) => `${x.label} ${x.pct.toFixed(1)}%`).join(', ')}>
            {p.pools.map((x) => <span key={x.key} style={{ width: `${Math.max(x.pct, 0.6)}%`, background: x.color }} />)}
          </div>
          <div className="legend">{p.pools.map((x) => <span key={x.key}><i className="sw" style={{ background: x.color }} />{x.label} {x.pct.toFixed(1)}%</span>)}</div>
        </div>
      </div>
    </section>
  );
}

export function ChartAnswer({ data }: { data: NavData }) {
  const c = data.chart;
  const xs = c.series, lo = Math.min(...xs), hi = Math.max(...xs);
  const d = xs.map((v, i) => `${i ? 'L' : 'M'}${((i / (xs.length - 1)) * 1000).toFixed(1)},${(250 - ((v - lo) / (hi - lo || 1)) * 230).toFixed(1)}`).join('');
  const [range, setRange] = useState('1Y');
  return (
    <section className={`card ${s.ans}`} data-nl-answer aria-label="Price chart (preview)">
      <div className={s.chartTools}>
        <div className="seg" role="group" aria-label="Range">
          {['1M', '3M', '6M', '1Y', '5Y', 'ALL'].map((r) => <button type="button" key={r} aria-pressed={range === r} onClick={() => setRange(r)}>{r}</button>)}
        </div>
        <span className="small mono">preview plot · last 12 months</span>
      </div>
      <svg className={s.plot} viewBox="0 0 1000 260" preserveAspectRatio="none" role="img" aria-label={`ZEC price over the last year, between $${Math.round(lo)} and $${Math.round(hi)}.`}>
        {[10, 87, 163, 240].map((y) => <line key={y} x1="0" x2="1000" y1={y} y2={y} stroke="var(--grid)" vectorEffect="non-scaling-stroke" />)}
        <path d={`${d}L1000,260L0,260Z`} fill="var(--zec)" opacity="0.08" />
        <path d={d} fill="none" stroke="var(--zec)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <p className="small">{c.caption}</p>
    </section>
  );
}

export function KpiStub({ data, ctx }: { data: NavData; ctx: Ctx }) {
  return (
    <div className={`kpis ${s.kpis}`}>
      {data.kpis[ctx].map((k) => <div className="kpi" key={k.k}><span className="k">{k.k}</span><span className="v num">{k.v}</span><span className="s">{k.s}</span></div>)}
    </div>
  );
}

/** Below-the-answer filler so phone frames scroll like a page. */
export function Body({ data, ctx }: { data: NavData; ctx: Ctx }) {
  return (
    <>
      {ctx === 'privacy' ? <PrivacyAnswer data={data} /> : <ChartAnswer data={data} />}
      <KpiStub data={data} ctx={ctx} />
      <div className={s.rest} aria-hidden="true"><span className="kicker">rest of the page</span></div>
    </>
  );
}

/** Title + one-sentence answer, the parts every direction keeps. */
export function Title({ ctx, data, className }: { ctx: Ctx; data: NavData; className?: string }) {
  return <h1 className={`h1 ${className ?? ''}`} data-nl-h1>{ctx === 'privacy' ? data.privacyPage.title : data.chart.title}</h1>;
}
export function Lede({ ctx, data, className }: { ctx: Ctx; data: NavData; className?: string }) {
  return <p className={`lede ${className ?? ''}`}><Rich text={ctx === 'privacy' ? data.privacyPage.lede : chartLede(data)} /></p>;
}

export function Brand({ short = false }: { short?: boolean }) {
  return <Link className={`brand ${s.brand}`} href="/" aria-label="ZEC Stats home"><span className="brand-mark" aria-hidden="true" />{!short && <span className={s.brandTxt}>ZEC STATS</span>}</Link>;
}

/** Value chip used in menus and section bars. */
export function Val({ children, hot = false }: { children: ReactNode; hot?: boolean }) {
  return <span className={`${s.val} ${hot ? s.hot : ''}`}>{children}</span>;
}

export function ItemLink({ it, current, onClick, className }: { it: Item; current?: boolean; onClick?: () => void; className?: string }) {
  return (
    <Link href={it.href} className={`${s.mi} ${className ?? ''}`} aria-current={current ? 'page' : undefined} onClick={onClick}>
      <span className={s.miT}>{it.featured && <i className={s.liveDot} aria-hidden="true" />}{it.label}{it.tag && <span className="tag">{it.tag}</span>}</span>
      {it.value && <span className={s.miV}>{it.value}</span>}
    </Link>
  );
}
