'use client';

import { usePathname, useRouter } from 'next/navigation';
import { CustomRange, RangeSeg, useCustomRange } from '@/components/charts/RangeControl';
import { presetFrom, RANGE_NAME, type DateWindow, type RangeKey } from '@/components/charts/range';

// /tx-sizes range bar: the chart pages' presets + Custom, with the same link state (?range=3M, or ?from=&to= for a
// custom window). The pooled distribution is computed by the server for the window, so a pick replaces the URL (no
// history entry, no scroll jump) and the server re-renders. `fixed`: only the active window has data.
export function TxRange({ presets, active, win, bounds, fixed, labelledBy }: {
  presets: RangeKey[]; active: RangeKey | null; win: DateWindow | null; bounds: DateWindow; fixed: boolean; labelledBy: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const custom = useCustomRange();
  const go = (edit: (q: URLSearchParams) => void) => {
    const q = new URLSearchParams(window.location.search);
    edit(q);
    const s = q.toString();
    router.replace(`${pathname}${s ? `?${s}` : ''}`, { scroll: false });
  };

  if (fixed) {
    return (
      <div className="seg" role="group" aria-labelledby={labelledBy}>
        {presets.map((r) => <button key={r} type="button" aria-pressed={active === r} disabled={active !== r} title={active === r ? RANGE_NAME[r] : 'Not available yet'}>{r}</button>)}
        <button type="button" disabled title="Not available yet">Custom</button>
      </div>
    );
  }
  return (
    <>
      <RangeSeg ranges={presets} active={active} label="Range"
        onPreset={(r) => { custom.setOpen(false); go((q) => { q.delete('from'); q.delete('to'); if (r === '1Y') q.delete('range'); else q.set('range', r); }); }}
        custom={{ ...custom, window: win }} />
      {custom.open && (
        <CustomRange id={custom.id} bounds={bounds} value={win ?? { from: presetFrom(active ?? '1Y', bounds.from, bounds.to), to: bounds.to }}
          onApply={(w) => { custom.close(); go((q) => { q.delete('range'); q.set('from', w.from); q.set('to', w.to); }); }}
          onClose={custom.close} />
      )}
    </>
  );
}
