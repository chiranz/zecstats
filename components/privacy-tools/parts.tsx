import type { ReactNode } from 'react';
import { POOL_COLOR } from '@/lib/data/snapshot';
import s from './ui.module.css';

export { s as ui };

/** KPI band of 3 (or 6) tiles; `one` = a lone row of 3 stacks to 1-up on phones instead of 2+1. */
export function K3({ children, label, one = false }: { children: ReactNode; label?: string; one?: boolean }) {
  return <div className={`kpis ${s.k3}${one ? ` ${s.one}` : ''}`} role="list" aria-label={label}>{children}</div>;
}

/** Numbered question section: "1  Does the turnstile hold?" + bold one-line answer. */
export function Q({ id, n, title, answer, children }: { id: string; n: ReactNode; title: ReactNode; answer?: ReactNode; children?: ReactNode }) {
  return (
    <section className={s.q} id={id} aria-labelledby={`${id}-h`}>
      <div className={s.qh}><span className={s.qn} aria-hidden="true">{n}</span><h2 className="h2" id={`${id}-h`}>{title}</h2></div>
      {answer && <p className={s.answer}>{answer}</p>}
      {children}
    </section>
  );
}

export const poolColor = (p: string) => POOL_COLOR[p as keyof typeof POOL_COLOR] ?? 'var(--p-transparent)';

export type BarItem = { key: string; label: ReactNode; value: number; text?: ReactNode; color?: string; strong?: boolean };
/** Horizontal bars, label left, value right. `stacked` puts the bar under the label (narrow cards). */
export function HBars({ items, max, stacked = false, label }: { items: BarItem[]; max?: number; stacked?: boolean; label: string }) {
  const m = max ?? Math.max(...items.map((i) => i.value), 1);
  return (
    <div className={`${s.bars}${stacked ? ` ${s.stacked}` : ''}`} role="list" aria-label={label}>
      {items.map((it) => (
        <div key={it.key} className={s.barRow} role="listitem" style={it.strong ? { color: 'var(--value)' } : undefined}>
          <span>{it.label}</span>
          <span className={s.track} aria-hidden="true"><span style={{ width: `${Math.max(0.6, (it.value / m) * 100)}%`, background: it.color ?? 'var(--s2)', opacity: it.strong ? 1 : 0.75 }} /></span>
          <span className={s.n}>{it.text ?? it.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Two-column prose for folded methodology. */
export function MoreCols({ children }: { children: ReactNode }) {
  return <div className={s.cols}>{children}</div>;
}
export function Prose({ children }: { children: ReactNode }) {
  return <div className={s.prose}>{children}</div>;
}
