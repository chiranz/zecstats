'use client';

import { useRouter } from 'next/navigation';
import { useId, useMemo, useState } from 'react';
import { compareHref, presetFrom, type CompareState, type DateWindow, type RangeKey } from '@/components/charts/range';
import { AnnToggle, CustomRange, RangeSeg, useCustomRange } from '@/components/charts/RangeControl';
import { Icon } from '@/components/ui/Icon';
import { CopyButton } from './CopyButton';

export type PickItem = { slug: string; title: string; group: string };
// the live compare page's presets (9M, YTD) plus our 2Y
const RANGES: RangeKey[] = ['1M', '3M', '6M', '9M', '1Y', '2Y', '5Y', 'YTD', 'ALL'];
const MAX = 6;

/**
 * Search-to-add, reorder/remove chips, the one shared range (preset or custom ?from=&to=) and the annotations toggle.
 * State lives in the URL (?charts=a,b&range=3M or &from=2024-01-01&to=2024-12-31, &ann=1).
 */
export function ComparePicker({ items, charts, state, bounds, hasEvents }: { items: PickItem[]; charts: string[]; state: CompareState; bounds: DateWindow | null; hasEvents: boolean }) {
  const router = useRouter();
  const custom = useCustomRange();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const id = useId();
  const title = (slug: string) => items.find((i) => i.slug === slug)?.title ?? slug;
  const matches = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter((i) => !charts.includes(i.slug) && words.every((w) => `${i.title} ${i.group} ${i.slug}`.toLowerCase().includes(w))).slice(0, 8);
  }, [q, items, charts]);
  const go = (next: string[]) => router.push(compareHref(next, state), { scroll: false });
  // view controls replace the history entry instead of adding one
  const view = (st: Partial<CompareState>) => router.replace(compareHref(charts, { ...state, ...st }), { scroll: false });
  const add = (slug: string) => { if (charts.length < MAX) go([...charts, slug]); setQ(''); setOpen(false); };
  const move = (i: number, d: -1 | 1) => { const n = [...charts]; [n[i], n[i + d]] = [n[i + d], n[i]]; go(n); };

  return (
    <div className="card" style={{ gap: 14, position: 'relative', zIndex: 5 }}>
      <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
        <div style={{ position: 'relative', flex: '1 1 320px', minWidth: 0 }}>
          <label className="sr-only" htmlFor={`${id}-q`}>Add a chart</label>
          <div className="field">
            <Icon name="search" size={16} />
            <input id={`${id}-q`} role="combobox" aria-expanded={open && matches.length > 0} aria-controls={`${id}-list`} aria-autocomplete="list" placeholder={charts.length >= MAX ? `Up to ${MAX} charts — remove one to add another` : 'Add a chart: price, shielded, fees…'} disabled={charts.length >= MAX}
              value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); setSel(0); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setSel((v) => Math.min(matches.length - 1, v + 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setSel((v) => Math.max(0, v - 1)); }
                if (e.key === 'Enter' && matches[sel]) { e.preventDefault(); add(matches[sel].slug); }
                if (e.key === 'Escape') setOpen(false);
              }} />
          </div>
          {open && matches.length > 0 && (
            <ul id={`${id}-list`} role="listbox" className="palette" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, maxHeight: 320, listStyle: 'none', margin: 0, padding: 6, overflowY: 'auto', zIndex: 10 }}>
              {matches.map((m, i) => (
                <li key={m.slug} role="option" aria-selected={i === sel}>
                  <button type="button" className={`p-row${i === sel ? ' sel' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => add(m.slug)}>
                    <span className="ic"><Icon name="chart" size={14} /></span>
                    <span><b>{m.title}</b><small>{m.group}</small></span>
                    <span className="v">add</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <RangeSeg label="Shared range" ranges={RANGES} active={state.win ? null : state.range} onPreset={(r) => { custom.setOpen(false); view({ range: r, win: null }); }}
          custom={bounds ? { ...custom, window: state.win } : undefined} />
        {hasEvents && <AnnToggle on={state.ann} onChange={(ann) => view({ ann })} />}
        <CopyButton />
      </div>
      {bounds && custom.open && (
        <CustomRange id={custom.id} bounds={bounds} value={state.win ?? { from: presetFrom(state.range, bounds.from, bounds.to), to: bounds.to }}
          onApply={(w) => { custom.close(); view({ win: w }); }} onClose={custom.close} />
      )}
      {charts.length > 0 && (
        <ol className="row" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 6 }} aria-label="Charts on this page, in order">
          {charts.map((c, i) => (
            <li key={c} className="chip" style={{ paddingRight: 4, gap: 4 }}>
              <span className="mono muted">{i + 1}</span> {title(c)}
              <button type="button" className="btn icon ghost" style={{ width: 24, height: 24 }} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${title(c)} up`}><Icon name="chevron-up" size={13} /></button>
              <button type="button" className="btn icon ghost" style={{ width: 24, height: 24 }} disabled={i === charts.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${title(c)} down`}><Icon name="chevron-down" size={13} /></button>
              <button type="button" className="btn icon ghost" style={{ width: 24, height: 24 }} onClick={() => go(charts.filter((x) => x !== c))} aria-label={`Remove ${title(c)}`}><Icon name="x" size={13} /></button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

