'use client';

import { useMemo, useState, type ReactElement } from 'react';
import s from './b.module.css';
import { useWidth, longDate, r2 } from './shared';

type Props = { cols: string[]; rows: string[]; cells: (number | null)[][]; ariaLabel?: string };

// Shade = share still unspent on a compressed scale (p^0.3) so a 1% remainder is still visible against "fully spent".
const GAMMA = 0.3;
const alpha = (pct: number) => Math.round((0.04 + 0.96 * Math.pow(Math.max(0, Math.min(100, pct)) / 100, GAMMA)) * 1000) / 1000;
const TICKS = [0, 1, 5, 20, 50, 100];

/** Retention triangle: x = snapshot date, y = creation cohort (newest on top), shade = % of that cohort still unspent. */
export function SurvivalTriangle(props: Record<string, unknown>) {
  const { cols, rows, cells, ariaLabel } = props as Props;
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const narrow = width < 520;
  const m = { top: 6, right: 8, bottom: 26, left: narrow ? 40 : 52 };
  const iw = width - m.left - m.right;
  const ih = Math.round(Math.min(560, Math.max(280, width * (narrow ? 0.9 : 0.5))));
  const h = ih + m.top + m.bottom;
  const nC = cols.length, nR = rows.length;
  const cw = iw / nC, ch = ih / nR;
  const yOf = (r: number) => (nR - 1 - r) * ch; // newest cohort on top

  // memoised elements: hovering re-renders the overlay only, not the ~8k cells
  const cellEls = useMemo(() => {
    const out: ReactElement[] = [];
    cells.forEach((row, r) => row.forEach((v, c) => {
      if (v != null) out.push(<rect key={`${r}-${c}`} x={r2(c * cw)} y={r2((nR - 1 - r) * ch)} width={r2(cw + 0.6)} height={r2(ch + 0.6)} fill="var(--zec)" fillOpacity={alpha(v)} />);
    }));
    return out;
  }, [cells, cw, ch, nR]);

  const yearTicks = (dates: string[], pos: (i: number) => number, minGap: number) => {
    const out: { p: number; t: string }[] = [];
    dates.forEach((d, i) => {
      if (i > 0 && d.slice(0, 4) === dates[i - 1].slice(0, 4)) return;
      const p = pos(i);
      if (out.length && Math.abs(p - out[out.length - 1].p) < minGap) return;
      out.push({ p, t: d.slice(0, 4) });
    });
    return out;
  };
  const xt = yearTicks(cols, (i) => i * cw, narrow ? 64 : 56);
  const yt = yearTicks(rows, (i) => yOf(i) + ch, 18);

  const pick = (clientX: number, clientY: number, el: HTMLElement) => {
    const b = el.getBoundingClientRect();
    const c = Math.floor((clientX - b.left - m.left) / cw), rr = nR - 1 - Math.floor((clientY - b.top - m.top) / ch);
    if (c < 0 || c >= nC || rr < 0 || rr >= nR || cells[rr]?.[c] == null) return setHover(null);
    setHover({ r: rr, c });
  };
  const cur = hover ? cells[hover.r][hover.c] : null;
  const ageWeeks = hover ? Math.round((Date.parse(cols[hover.c]) - Date.parse(rows[hover.r])) / (7 * 86400000)) : 0;
  const tipX = hover ? m.left + hover.c * cw : 0;

  return (
    <div>
      <div className={s.legend} aria-hidden="true">
        <span>Share of the cohort still unspent</span>
        <div>
          <div className={s.ramp} />
          <div className={s.rampTicks}>{(narrow ? TICKS.filter((t) => t !== 50) : TICKS).map((t) => <span key={t} style={{ left: `${r2(Math.pow(t / 100, GAMMA) * 100)}%` }}>{t}%</span>)}</div>
        </div>
      </div>
      <div
        ref={ref}
        className={s.wrap}
        role="img"
        aria-label={ariaLabel ?? 'Coin survival retention triangle'}
        tabIndex={0}
        style={{ touchAction: 'pan-y' }}
        onPointerMove={(e) => pick(e.clientX, e.clientY, e.currentTarget)}
        onPointerLeave={() => setHover(null)}
        onBlur={() => setHover(null)}
        onKeyDown={(e) => {
          const d: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [1, 0], ArrowDown: [-1, 0] };
          if (e.key === 'Escape') return setHover(null);
          const mv = d[e.key];
          if (!mv) return;
          e.preventDefault();
          setHover((h0) => {
            const st = h0 ?? { r: nR - 1, c: nC - 1 };
            const r = Math.max(0, Math.min(nR - 1, st.r + mv[0])), c = Math.max(0, Math.min(nC - 1, st.c + mv[1]));
            return cells[r]?.[c] != null ? { r, c } : st;
          });
        }}
      >
        <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} aria-hidden="true">
          <g transform={`translate(${m.left},${m.top})`}>
            {cellEls}
            <line className="ax" x1={0} x2={iw} y1={ih} y2={ih} />
            <line className="ax" x1={0} x2={0} y1={0} y2={ih} />
            {xt.map((t, i) => <text key={`x${i}`} x={r2(t.p)} y={ih + 18} textAnchor={i === 0 ? 'start' : 'middle'}>{t.t}</text>)}
            {yt.map((t, i) => <text key={`y${i}`} x={-8} y={r2(t.p)} dy="-0.2em" textAnchor="end">{t.t}</text>)}
            {hover && <rect x={hover.c * cw - 1} y={yOf(hover.r) - 1} width={cw + 2} height={ch + 2} fill="none" stroke="var(--value)" strokeWidth={1.5} />}
          </g>
        </svg>
        {hover && cur != null && (
          <div className="tip" style={{ top: 8, left: tipX > width - 240 ? undefined : tipX + 16, right: tipX > width - 240 ? width - tipX + 8 : undefined, pointerEvents: 'none' }}>
            <b>Created 4 weeks from {longDate(rows[hover.r])}</b>
            <span>As of {longDate(cols[hover.c])} · age {ageWeeks >= 104 ? `${(ageWeeks / 52).toFixed(1)} years` : `${ageWeeks} weeks`}</span>
            <span className={s.tipRow}><i className="sw" style={{ background: 'var(--zec)', opacity: alpha(cur) }} /><span>Still unspent</span><b>{cur < 1 ? cur.toFixed(2) : cur.toFixed(1)}%</b></span>
          </div>
        )}
      </div>
      <p className="small" style={{ marginTop: 8 }}>Across: snapshot date · down: the four weeks each cohort was created, newest at the top.</p>
    </div>
  );
}
