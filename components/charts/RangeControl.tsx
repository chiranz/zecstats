'use client';

// The one range control for dated charts: presets (`1M 3M 6M 9M 1Y 5Y YTD ALL`) + "Custom", which opens two date
// inputs clamped to the data. The panel is a separate component so pages can place it outside a scrolling toolbar.
import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { dateLong } from '@/lib/format';
import { customWindow, isIsoDate, RANGE_NAME, type DateWindow, type RangeKey } from './range';
import css from './RangeControl.module.css';

/** Open/close state for the Custom panel; closing returns focus to the Custom button. */
export function useCustomRange() {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = () => { setOpen(false); window.requestAnimationFrame(() => btn.current?.focus()); };
  return { open, setOpen, btn, id: `custom-${id.replace(/:/g, '')}`, close };
}

export function RangeSeg({ ranges, active, onPreset, custom, label = 'Range' }: {
  ranges: RangeKey[];
  /** The pressed preset, or null while a custom window is applied. */
  active: RangeKey | null;
  onPreset: (r: RangeKey) => void;
  custom?: { open: boolean; setOpen: (v: boolean) => void; btn: RefObject<HTMLButtonElement | null>; id: string; window?: DateWindow | null };
  label?: string;
}) {
  const w = custom?.window;
  const ref = useRef<HTMLDivElement>(null);
  // on phones the control scrolls sideways: keep the active button in view (without scrolling the page)
  useEffect(() => {
    const el = ref.current, b = el?.querySelector<HTMLElement>('[aria-pressed="true"], [aria-current="true"]');
    if (!el || !b || el.scrollWidth <= el.clientWidth) return;
    if (b.offsetLeft + b.offsetWidth > el.scrollLeft + el.clientWidth || b.offsetLeft < el.scrollLeft) el.scrollLeft = b.offsetLeft - 8;
  }, [active]);
  return (
    <div ref={ref} className="seg" role="group" aria-label={label}>
      {ranges.map((r) => (
        <button key={r} type="button" aria-pressed={active === r} title={RANGE_NAME[r]} onClick={() => onPreset(r)}>{r}</button>
      ))}
      {custom && (
        <button ref={custom.btn} type="button" aria-expanded={custom.open} aria-controls={custom.open ? custom.id : undefined}
          aria-current={active === null ? 'true' : undefined}
          aria-label={active === null && w ? `Custom range, ${dateLong(w.from)} to ${dateLong(w.to)}` : 'Custom range'}
          title={active === null && w ? `${dateLong(w.from)} – ${dateLong(w.to)}` : 'Pick start and end dates'}
          onClick={() => custom.setOpen(!custom.open)}>Custom</button>
      )}
    </div>
  );
}

export function CustomRange({ id, bounds, value, onApply, onClose }: {
  id: string;
  /** The data's first and last dates: the inputs are clamped to them. */
  bounds: DateWindow;
  /** The window shown when the panel opens. */
  value: DateWindow;
  onApply: (w: DateWindow) => void;
  onClose: () => void;
}) {
  const [from, setFrom] = useState(value.from);
  const [to, setTo] = useState(value.to);
  const [err, setErr] = useState('');
  const fromRef = useRef<HTMLInputElement>(null);
  useEffect(() => { fromRef.current?.focus(); }, []);

  return (
    <form id={id} className={css.panel} aria-label="Custom date range" noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!isIsoDate(from) || !isIsoDate(to)) { setErr('Enter both dates.'); return; }
        const w = customWindow(from, to, bounds.from, bounds.to);
        if (w) onApply(w);
      }}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } }}>
      <label className={css.f}>
        <span>From</span>
        <input ref={fromRef} type="date" min={bounds.from} max={bounds.to} value={from} onChange={(e) => { setFrom(e.target.value); setErr(''); }} aria-describedby={`${id}-hint`} />
      </label>
      <label className={css.f}>
        <span>To</span>
        <input type="date" min={bounds.from} max={bounds.to} value={to} onChange={(e) => { setTo(e.target.value); setErr(''); }} aria-describedby={`${id}-hint`} />
      </label>
      <div className={css.acts}>
        <button type="submit" className="btn primary">Apply</button>
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
      </div>
      <p className={css.hint} id={`${id}-hint`}>Data runs {dateLong(bounds.from)} – {dateLong(bounds.to)}; dates outside it are moved to the nearest end.</p>
      {err && <p className={css.err} role="alert">{err}</p>}
    </form>
  );
}

/** Show/hide the network-upgrade (and other event) markers. */
export function AnnToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="seg" role="group" aria-label="Annotations">
      <button type="button" aria-pressed={on} title={on ? 'Hide event markers' : 'Show event markers'} onClick={() => onChange(!on)}>Annotations</button>
    </div>
  );
}
