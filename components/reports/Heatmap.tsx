'use client';

import { useRef, useState, type KeyboardEvent } from 'react';

/** Rows × columns heatmap (HTML grid, so labels stay legible at any width): one hue whose opacity rises with the
 *  value, a scale legend, and the shared tooltip. The grid is one tab stop; arrow keys (Home/End too) move between
 *  cells, and each cell's accessible name carries its value, so it reads without a mouse. `colNames` are the
 *  long column names for the tooltip and screen readers (defaults to `cols`). */
export function Heatmap({ rows, cols, colNames, values, color = 'var(--s1)', unit, ariaLabel, colTicks }: {
  rows: string[]; cols: string[]; colNames?: string[]; values: number[][]; color?: string; unit: string; ariaLabel: string; colTicks?: number[];
}) {
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [cur, setCur] = useState<[number, number]>([0, 0]);
  const cells = useRef<(HTMLElement | null)[]>([]);
  const flat = values.flat();
  const lo = Math.min(...flat), hi = Math.max(...flat);
  const t = (v: number) => (hi === lo ? 1 : (v - lo) / (hi - lo));
  // the hue mixed toward transparent (not element opacity), so a focused cell's outline stays fully visible
  const fill = (x: number) => `color-mix(in srgb, ${color} ${Math.round((0.08 + 0.92 * x ** 1.4) * 1000) / 10}%, transparent)`;
  const ticks = new Set(colTicks ?? cols.map((_, i) => i));
  const name = (ci: number) => colNames?.[ci] ?? cols[ci];
  const nc = cols.length;
  const move = (e: KeyboardEvent, ri: number, ci: number) => {
    const k = e.key;
    let r = ri, c = ci;
    if (k === 'ArrowRight') c = Math.min(nc - 1, c + 1); else if (k === 'ArrowLeft') c = Math.max(0, c - 1);
    else if (k === 'ArrowDown') r = Math.min(rows.length - 1, r + 1); else if (k === 'ArrowUp') r = Math.max(0, r - 1);
    else if (k === 'Home') c = 0; else if (k === 'End') c = nc - 1;
    else if (k === 'Escape') { setHover(null); return; } else return;
    e.preventDefault();
    setCur([r, c]); setHover([r, c]);
    cells.current[r * nc + c]?.focus();
  };
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div role="grid" aria-label={ariaLabel} style={{ position: 'relative', display: 'grid', gridTemplateColumns: `36px repeat(${nc}, minmax(0, 1fr))`, gap: 2, font: '400 12px var(--mono)', color: 'var(--muted)' }} onPointerLeave={() => setHover(null)}>
        {values.map((row, ri) => (
          <div key={ri} role="row" style={{ display: 'contents' }}>
            <span role="rowheader" style={{ alignSelf: 'center' }}>{rows[ri]}</span>
            {row.map((v, ci) => {
              const on = hover && hover[0] === ri && hover[1] === ci;
              return (
                <i key={ci} ref={(el) => { cells.current[ri * nc + ci] = el; }} role="gridcell" tabIndex={cur[0] === ri && cur[1] === ci ? 0 : -1}
                  aria-label={`${rows[ri]} ${name(ci)}: ${v.toLocaleString('en-US')} ${unit}`}
                  onPointerEnter={() => setHover([ri, ci])} onFocus={() => { setCur([ri, ci]); setHover([ri, ci]); }} onBlur={() => setHover(null)} onKeyDown={(e) => move(e, ri, ci)}
                  style={{ height: 30, borderRadius: 3, background: fill(t(v)), outline: on ? '2px solid var(--value)' : undefined, outlineOffset: 0 }} />
              );
            })}
          </div>
        ))}
        <span aria-hidden="true" />
        {cols.map((c, ci) => <span key={`c${ci}`} aria-hidden="true" style={{ textAlign: 'center', whiteSpace: 'nowrap', overflow: 'visible' }}>{ticks.has(ci) ? c : ''}</span>)}
        {hover && (
          <div className="tip" aria-hidden="true" style={{ pointerEvents: 'none', left: `min(calc(36px + ${((hover[1] + 1) / nc) * 100}% * 0.9), calc(100% - 200px))`, top: (hover[0] + 1) * 32 + 4 }}>
            <b>{rows[hover[0]]} · {name(hover[1])}</b>
            <span>{values[hover[0]][hover[1]].toLocaleString('en-US')} {unit}</span>
            <span className="muted">{Math.round(t(values[hover[0]][hover[1]]) * 100)}% of the way from the quietest to the busiest hour</span>
          </div>
        )}
      </div>
      <div className="row small" style={{ gap: 10 }} aria-hidden="true">
        <span>Quietest {lo.toLocaleString('en-US')}</span>
        <span style={{ display: 'inline-flex', gap: 2 }}>
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((x) => <i key={x} style={{ width: 22, height: 10, borderRadius: 2, background: fill(x) }} />)}
        </span>
        <span>Busiest {hi.toLocaleString('en-US')} {unit}</span>
      </div>
    </div>
  );
}
