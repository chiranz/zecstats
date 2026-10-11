'use client';

// "Where does each value sit against a reference today?" — one row per item, a dot on a shared (log or linear) scale,
// and a dashed reference line (spot price, actual market cap …). Used by cost-basis and implied-mcap.
import { formatValue, type ValueFormat } from '@/components/charts/valueFormat';
import s from './a.module.css';

type DotRow = { label: string; color: string; value: number | null; note?: string };
type Props = { rows: DotRow[]; reference: { label: string; value: number }; format: ValueFormat; log?: boolean; caption?: string; ariaLabel: string };

export function DotPlot(props: Record<string, unknown>) {
  const { rows, reference: ref, format, log = false, caption, ariaLabel } = props as unknown as Props;
  const vals = [...rows.map((r) => r.value).filter((v): v is number => v != null && v > 0), ref.value];
  const lo = log ? Math.min(...vals) / 1.6 : 0;
  const hi = Math.max(...vals) * (log ? 1.6 : 1.12);
  const pos = (v: number) => Math.round((log ? (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)) : (v - lo) / (hi - lo)) * 1e5) / 1e3;
  const refPct = pos(ref.value);
  return (
    <figure className={s.dots} role="img" aria-label={ariaLabel}>
      <div className={s.dotHead} aria-hidden="true">
        <span />
        <span className={s.dotTrack}><span className={s.refLab} style={{ left: `${refPct}%`, transform: `translateX(${refPct > 65 ? -100 : refPct < 35 ? 0 : -50}%)` }}>{ref.label} {formatValue(ref.value, format)}</span></span>
        <span />
      </div>
      {rows.map((r) => (
        <div key={r.label} className={s.dotRow}>
          <span className={s.dotName}><i className={s.dot} style={{ background: r.color }} aria-hidden="true" />{r.label}</span>
          <span className={s.dotTrack} aria-hidden="true">
            <i className={s.refLine} style={{ left: `${refPct}%` }} />
            {r.value != null && r.value > 0 && <i className={s.dotMark} style={{ left: `${pos(r.value)}%`, background: r.color }} />}
          </span>
          <span className={s.dotVal}>{r.value == null ? '—' : formatValue(r.value, format)}{r.note && <span className="muted"> {r.note}</span>}</span>
        </div>
      ))}
      {caption && <figcaption className="small">{caption}</figcaption>}
    </figure>
  );
}
