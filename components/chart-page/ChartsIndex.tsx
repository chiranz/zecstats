'use client';

// /charts directory: filter bar (search with synonyms, pool / unit / source facets, "Compare with Bitcoin"),
// sticky group rail, and per group a "Start here" card + aligned rows (name … sparkline · latest value).
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Sparkline } from '@/components/charts/Sparkline';
import { delta } from '@/lib/format';
import type { ChartGroupId, DataSourceKind, Headline } from '@/lib/charts/types';
import s from './charts-index.module.css';

export type UnitKind = 'ZEC' | 'USD' | 'Count' | '%' | 'Ratio';
export type IndexItem = {
  slug: string; group: ChartGroupId; title: string; built: boolean; value: string; spark: number[]; sparkWindow: string; ext: boolean;
  source?: DataSourceKind; unit?: UnitKind; pools: string[]; vsBtc: boolean; keywords: string;
  feat?: { value: string; change: Headline['change']; caption: string; color: string; descriptor?: string };
};
type Group = { id: ChartGroupId; title: string; question: string; desc: string };

const POOLS = [
  { key: 'transparent', label: 'Transparent' }, { key: 'sprout', label: 'Sprout' }, { key: 'sapling', label: 'Sapling' },
  { key: 'orchard', label: 'Orchard' }, { key: 'ironwood', label: 'Ironwood' },
];
const UNITS: ('Any' | UnitKind)[] = ['Any', 'ZEC', 'USD', 'Count', '%', 'Ratio'];
const SOURCES: { key: 'any' | DataSourceKind; label: string }[] = [
  { key: 'any', label: 'Any' }, { key: 'onchain', label: 'On-chain exact' }, { key: 'price', label: 'Price-derived' }, { key: 'external', label: 'External' },
];
const BTC_FEATURE = 'zec-btc-ratio';

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim();

export function ChartsIndex({ items, groups }: { items: IndexItem[]; groups: Group[] }) {
  const [q, setQ] = useState('');
  const [pools, setPools] = useState<Set<string>>(new Set());
  const [unit, setUnit] = useState<'Any' | UnitKind>('Any');
  const [source, setSource] = useState<'any' | DataSourceKind>('any');
  const [btc, setBtc] = useState(false);
  const [openF, setOpenF] = useState(false);
  const [active, setActive] = useState<string>(`g-${groups[0].id}`);

  const match = useMemo(() => {
    const phrase = norm(q);
    // every word of 3+ letters must appear; short words ("z", "to") only count as part of the whole phrase
    const words = phrase.split(' ').filter((w) => w.length >= 3);
    return (it: IndexItem) => {
      if (phrase) {
        const hay = norm(`${it.title} ${it.slug} ${it.keywords}`);
        if (!hay.includes(phrase) && !(words.length && words.every((w) => hay.includes(w)))) return false;
      }
      if (pools.size && !it.pools.some((p) => pools.has(p))) return false;
      if (unit !== 'Any' && it.unit !== unit) return false;
      if (source !== 'any' && it.source !== source) return false;
      if (btc && !it.vsBtc) return false;
      return true;
    };
  }, [q, pools, unit, source, btc]);

  const shown = items.filter(match);
  const filtering = shown.length !== items.length;
  const activeCount = pools.size + (unit !== 'Any' ? 1 : 0) + (source !== 'any' ? 1 : 0) + (btc ? 1 : 0);
  const clear = () => { setQ(''); setPools(new Set()); setUnit('Any'); setSource('any'); setBtc(false); };

  const sections = [
    ...groups.map((g) => ({ id: `g-${g.id}`, title: g.question, label: g.title, desc: g.desc, all: items.filter((i) => i.group === g.id), collection: false })),
    { id: 'g-btc', title: 'How does ZEC stack up against Bitcoin?', label: 'ZEC vs BTC', desc: 'A collection, not a folder: every chart that compares ZEC with BTC. Several line the chains up by coins issued instead of by date.', all: [...items.filter((i) => i.slug === BTC_FEATURE), ...items.filter((i) => i.vsBtc && i.slug !== BTC_FEATURE)], collection: true },
  ];
  const groupTitle = (id: ChartGroupId) => groups.find((g) => g.id === id)?.title ?? id;

  // Rail highlight follows the section in view.
  useEffect(() => {
    const els = sections.map((x) => document.getElementById(x.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver((ents) => {
      const vis = ents.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActive(vis[0].target.id);
    }, { rootMargin: '-30% 0px -60% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown.length]);

  return (
    <div className={s.wrap}>
      <div className={s.fbar} role="search" aria-label="Filter charts">
        <div className={s.frow}>
          <label className={`field ${s.search}`} htmlFor="chart-q">
            <Icon name="search" size={16} />
            <input id="chart-q" type="search" placeholder="Search charts, e.g. “z-to-z”" value={q} onChange={(e) => setQ(e.target.value)} aria-describedby="chart-syn" />
          </label>
          <span className={s.syn} id="chart-syn">Synonyms work: <b>z-to-z</b> → Orchard internal activity · <b>cost basis</b> → Realized price</span>
          <span className={s.count} aria-live="polite"><b className="num">{shown.length}</b>{filtering ? <span className={s.of}> of {items.length}</span> : null} charts</span>
        </div>
        <div className={s.mfil}>
          <button type="button" className={`btn ${s.fbtn}`} aria-expanded={openF} aria-controls="chart-facets" onClick={() => setOpenF((v) => !v)}>
            <Icon name="filter" size={14} />Filters{activeCount > 0 && <span className={s.fn}>{activeCount}</span>}
          </button>
          {[...pools].map((p) => (
            <button key={p} type="button" className="chip" aria-pressed="true" onClick={() => setPools((x) => { const n = new Set(x); n.delete(p); return n; })} aria-label={`Remove filter ${p}`}>
              <i className={s.dot} style={{ background: `var(--p-${p})` }} aria-hidden="true" />{POOLS.find((x) => x.key === p)?.label}<Icon name="x" size={12} />
            </button>
          ))}
          {unit !== 'Any' && <button type="button" className="chip" aria-pressed="true" onClick={() => setUnit('Any')} aria-label={`Remove filter ${unit}`}>{unit}<Icon name="x" size={12} /></button>}
          {source !== 'any' && <button type="button" className="chip" aria-pressed="true" onClick={() => setSource('any')} aria-label="Remove source filter">{SOURCES.find((x) => x.key === source)?.label}<Icon name="x" size={12} /></button>}
          {btc && <button type="button" className="chip" aria-pressed="true" onClick={() => setBtc(false)} aria-label="Remove ZEC vs BTC filter">vs BTC<Icon name="x" size={12} /></button>}
        </div>
        <div className={`${s.frow} ${s.facets}`} id="chart-facets" data-open={openF || undefined}>
          <div className={s.facet}>
            <span className={s.lbl}>Pool</span>
            <div className={s.chipset}>
              {POOLS.map((p) => (
                <button key={p.key} className="chip" type="button" aria-pressed={pools.has(p.key)} onClick={() => setPools((x) => { const n = new Set(x); if (n.has(p.key)) n.delete(p.key); else n.add(p.key); return n; })}>
                  <i className={s.dot} style={{ background: `var(--p-${p.key})` }} aria-hidden="true" />{p.label}
                </button>
              ))}
            </div>
          </div>
          <div className={s.facet}>
            <span className={s.lbl}>Unit</span>
            <div className="seg" role="group" aria-label="Unit">{UNITS.map((u) => <button key={u} type="button" aria-pressed={unit === u} onClick={() => setUnit(u)}>{u}</button>)}</div>
          </div>
          <div className={s.facet}>
            <span className={s.lbl}>Source</span>
            <div className="seg" role="group" aria-label="Source">{SOURCES.map((x) => <button key={x.key} type="button" aria-pressed={source === x.key} onClick={() => setSource(x.key)}>{x.label}</button>)}</div>
          </div>
          <label className={s.switch} htmlFor="chart-btc">
            <input id="chart-btc" type="checkbox" role="switch" checked={btc} onChange={(e) => setBtc(e.target.checked)} />
            <span className={s.trk} aria-hidden="true" />Compare with Bitcoin
          </label>
        </div>
      </div>

      <div className={s.dir}>
        <nav className={s.rail} aria-label="Chart groups">
          <span className={s.rlab}>Groups</span>
          {sections.filter((x) => !x.collection).map((x) => {
            const n = x.all.filter(match).length;
            if (filtering && !n) return null;
            return <a key={x.id} className={s.cat} href={`#${x.id}`} aria-current={active === x.id ? 'true' : undefined}>{x.label}<span className="num">{n}</span></a>;
          })}
          {(() => {
            const x = sections[sections.length - 1];
            const n = x.all.filter(match).length;
            if (filtering && !n) return null;
            return (
              <>
                <span className={s.rsep} aria-hidden="true" />
                <span className={s.rlab}>Collection</span>
                <a className={s.cat} href={`#${x.id}`} aria-current={active === x.id ? 'true' : undefined}>{x.label}<span className="num">{n}</span></a>
              </>
            );
          })()}
          <div className={s.rnote}>
            <p><span className={s.ext}>ext</span>External data: exchanges, NEAR, Hyperliquid, SEC filings or the Bitcoin chain. Everything else comes from our Zebra node.</p>
            <p>Looking for calculators or reports? They are in the Tools menu. How the numbers are made: <Link href="/tools">Methodology</Link>.</p>
          </div>
        </nav>

        <div className={s.groups}>
          {sections.map((sec) => {
            const list = sec.all.filter(match);
            if (!list.length) return null;
            const [feat, ...rest] = !filtering ? list : list[0] === sec.all[0] ? list : [undefined, ...list];
            return (
              <section key={sec.id} className={`${s.grp} ${feat ? '' : s.nofeat}`} id={sec.id} aria-labelledby={`${sec.id}-h`}>
                <div className={s.grpH}>
                  <div className="sec-h"><h2 className="h2" id={`${sec.id}-h`}>{sec.title}</h2></div>
                  <span className={s.gmeta}>{sec.collection && <span className={s.coll}>Collection</span>}{sec.label} · <span className="num">{list.length}</span> {list.length === 1 ? 'chart' : 'charts'}</span>
                  <p>{sec.desc}</p>
                </div>
                <div className={s.grpBody}>
                  {feat && <Feature it={feat} also={sec.collection ? groupTitle(feat.group) : undefined} />}
                  <div className={s.rows}>
                    {(rest as IndexItem[]).map((it) => <Row key={it.slug} it={it} also={sec.collection ? groupTitle(it.group) : undefined} />)}
                  </div>
                </div>
              </section>
            );
          })}
          {filtering && (
            <div className={s.endnote}>
              <span>{items.length - shown.length} more charts don’t match{q ? <> “<b>{q}</b>”</> : null}{activeCount ? ` and ${activeCount} filter${activeCount > 1 ? 's' : ''}` : ''}.</span>
              <button type="button" className="btn" onClick={clear}>Clear filters</button>
            </div>
          )}
          {!shown.length && <p className="note">No chart matches. Try another word — “shielded”, “fees”, “bitcoin”.</p>}
        </div>
      </div>
    </div>
  );
}

function Ext() { return <span className={s.ext} title="External data">ext</span>; }

function Row({ it, also }: { it: IndexItem; also?: string }) {
  const pool = it.pools.length === 1 ? it.pools[0] : null;
  const descriptor = !/^[−\-+$]?[\d.,]/.test(it.value);
  return (
    <Link className={s.row} href={`/chart/${it.slug}`}>
      <span className={s.n}>
        {pool && <i className={s.dot} style={{ background: `var(--p-${pool})` }} aria-hidden="true" />}
        <span>{it.title}{it.ext && <Ext />}{also && <span className={s.also}>also in {also}</span>}</span>
      </span>
      <Sparkline className={s.spark} values={it.spark} width={64} height={20} window={it.sparkWindow} label={it.title} empty={<span className={s.spark} aria-hidden="true" />} />
      <span className={`${s.v} ${descriptor || !it.built ? s.d : ''}`}>{it.built ? it.value : '—'}{!it.built && <span className="sr-only"> (coming soon)</span>}</span>
      <span className={s.go} aria-hidden="true">→</span>
    </Link>
  );
}

function Feature({ it, also }: { it: IndexItem; also?: string }) {
  const f = it.feat;
  const ch = f?.change;
  const d = ch && Number.isFinite(ch.pct) ? delta(ch.pct, ch.pts ? 2 : Math.abs(ch.pct) >= 100 ? 0 : 1, ch.pts ? ' pts' : '%', ch.good) : null;
  return (
    <Link className={s.feat} href={`/chart/${it.slug}`}>
      <span className={s.fk}><i aria-hidden="true" />Start here</span>
      <span className={s.ft}>{it.title}{it.ext && <Ext />}</span>
      <span className={s.fv}>
        <span className="num">{f ? f.value : '—'}</span>
        {ch && d ? (
          <span className={`delta${d.cls === 'dn' ? ' dn' : d.cls === 'muted' ? ' flat' : ''}`}>{d.text} <span className={s.dk}>{ch.days}d</span></span>
        ) : f?.descriptor && f.descriptor !== f.value ? <span className={`delta ${s.neutral}`}>{f.descriptor}</span> : null}
      </span>
      <Sparkline className={s.mini} values={it.spark} height={96} fluid color={f?.color ?? 'var(--text-2)'} window={it.sparkWindow} label={it.title} />
      {it.spark.length > 1 && <span className={s.fw}>{it.sparkWindow} trend</span>}
      <span className={s.fc}>{f ? f.caption : 'Coming soon'}{also ? ` · also in ${also}` : ''}</span>
      <span className={s.fo}>Open chart <Icon name="arrow-right" size={13} /></span>
    </Link>
  );
}
