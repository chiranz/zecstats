'use client';

import { useState } from 'react';

/** Rows × columns heatmap (HTML grid, so labels stay legible at any width): one hue whose opacity rises with the
 *  value, a scale legend, and the shared tooltip. */
export function Heatmap({ rows, cols, values, color = 'var(--s1)', unit, ariaLabel, colTicks }: {
  rows: string[]; cols: string[]; values: number[][]; color?: string; unit: string; ariaLabel: string; colTicks?: number[];
}) {
  const [hover, setHover] = useState<[number, number] | null>(null);
  const flat = values.flat();
  const lo = Math.min(...flat), hi = Math.max(...flat);
  const t = (v: number) => (hi === lo ? 1 : (v - lo) / (hi - lo));
  const op = (x: number) => 0.08 + 0.92 * x ** 1.4;
  const ticks = new Set(colTicks ?? cols.map((_, i) => i));
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div role="img" aria-label={ariaLabel} style={{ position: 'relative', display: 'grid', gridTemplateColumns: `36px repeat(${cols.length}, minmax(0, 1fr))`, gap: 2, font: '400 12px var(--mono)', color: 'var(--muted)' }} onPointerLeave={() => setHover(null)}>
        {values.map((row, ri) => [
          <span key={`l${ri}`} style={{ alignSelf: 'center' }}>{rows[ri]}</span>,
          ...row.map((v, ci) => (
            <i key={`${ri}-${ci}`} onPointerEnter={() => setHover([ri, ci])}
              style={{ height: 30, borderRadius: 3, background: color, opacity: Math.round(op(t(v)) * 1000) / 1000, outline: hover && hover[0] === ri && hover[1] === ci ? '1.5px solid var(--value)' : undefined, outlineOffset: 0 }} />
          )),
        ])}
        <span />
        {cols.map((c, ci) => <span key={`c${ci}`} style={{ textAlign: 'center', whiteSpace: 'nowrap', overflow: 'visible' }}>{ticks.has(ci) ? c : ''}</span>)}
        {hover && (
          <div className="tip" style={{ pointerEvents: 'none', left: `min(calc(36px + ${((hover[1] + 1) / cols.length) * 100}% * 0.9), calc(100% - 200px))`, top: (hover[0] + 1) * 32 + 4 }}>
            <b>{rows[hover[0]]} · {cols[hover[1]]} UTC</b>
            <span>{values[hover[0]][hover[1]].toLocaleString('en-US')} {unit}</span>
            <span className="muted">{Math.round(t(values[hover[0]][hover[1]]) * 100)}% of the way from the quietest to the busiest hour</span>
          </div>
        )}
      </div>
      <div className="row small" style={{ gap: 10 }} aria-hidden="true">
        <span>Quietest {lo.toLocaleString('en-US')}</span>
        <span style={{ display: 'inline-flex', gap: 2 }}>
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((x) => <i key={x} style={{ width: 22, height: 10, borderRadius: 2, background: color, opacity: Math.round(op(x) * 1000) / 1000 }} />)}
        </span>
        <span>Busiest {hi.toLocaleString('en-US')} {unit}</span>
      </div>
    </div>
  );
}
