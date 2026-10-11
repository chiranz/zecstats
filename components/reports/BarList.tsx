import type { ReactNode } from 'react';
import s from './report.module.css';

export type BarPart = { key: string; value: number; color: string; label?: string };
export type BarItem = { key: string; name: ReactNode; value: ReactNode; sub?: ReactNode; parts: BarPart[]; highlight?: boolean; title?: string };

/** Ranked horizontal bars, name above the bar, value at the right. Bars share one scale (`max`). */
export function BarList({ items, max, label }: { items: BarItem[]; max?: number; label: string }) {
  const top = max ?? Math.max(1, ...items.map((it) => it.parts.reduce((a, p) => a + p.value, 0)));
  return (
    <ol className={s.bars} aria-label={label} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map((it) => (
        <li key={it.key} className={`${s.barRow} ${it.highlight ? s.hl : ''}`}>
          <span className={s.nm} title={it.title}>{it.name}</span>
          <span className={s.n}>{it.value}{it.sub && <small>{it.sub}</small>}</span>
          <span className={s.track} aria-hidden="true">
            {it.parts.map((p) => (p.value > 0 ? <span key={p.key} style={{ width: `${(p.value / top) * 100}%`, background: p.color }} title={p.label} /> : null))}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** 100% share bar with a key underneath (value + percent). */
export function ShareBar({ parts, label }: { parts: { key: string; label: string; value: number; color: string; display?: string }[]; label: string }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className={s.share} role="img" aria-label={label}>
        {parts.map((p) => (p.value > 0 ? <span key={p.key} style={{ flex: `${p.value} 0 0`, background: p.color }} /> : null))}
      </div>
      <div className={s.shareKey} style={{ ['--cols' as string]: Math.min(parts.length, 4) }}>
        {parts.map((p) => (
          <div key={p.key}>
            <span className={s.l}><i className="sw" style={{ background: p.color }} />{p.label}</span>
            <b>{p.display ?? p.value.toLocaleString('en-US')}</b>
            <span>{((p.value / total) * 100).toFixed(p.value / total < 0.01 ? 1 : 0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Pill({ tone, children }: { tone: 'ok' | 'lag' | 'bad' | 'unk'; children: ReactNode }) {
  return <span className={`${s.pill} ${s[tone]}`}><i aria-hidden="true" />{children}</span>;
}
