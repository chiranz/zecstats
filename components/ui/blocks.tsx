import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';
import { delta, num, type Good } from '@/lib/format';
import { ChartActionsClient, type ChartActionsCsv } from '@/components/charts/ChartActionsClient';

/* ---------- section header with the terminal "//" prefix ---------- */
export function Section({ id, title, aside, children, className }: { id?: string; title: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`sec ${className ?? ''}`} id={id} aria-labelledby={id ? `${id}-h` : undefined} style={{ scrollMarginTop: 120 }}>
      <div className="sec-h">
        <h2 className="h2" id={id ? `${id}-h` : undefined}>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/* ---------- KPI band (full rows only: 4, 6, 8, 12 tiles) ---------- */
export function KpiBand({ children, six = false, label }: { children: ReactNode; six?: boolean; label?: string }) {
  return <div className={`kpis${six ? ' six' : ''}`} role="list" aria-label={label}>{children}</div>;
}
export function Kpi({ k, v, unit, s, href }: { k: ReactNode; v: ReactNode; unit?: ReactNode; s?: ReactNode; href?: string }) {
  const body = (
    <>
      <span className="k">{k}</span>
      <span className="v">{v}{unit && <span className="u">{unit}</span>}</span>
      {s && <span className="s">{s}</span>}
    </>
  );
  return href ? <Link className="kpi kpi-link" role="listitem" href={href}>{body}</Link> : <div className="kpi" role="listitem">{body}</div>;
}

/* ---------- delta: the arrow shows direction, the colour good/bad (`good`); a change that rounds to 0 is flat (muted, no arrow) ---------- */
export function Delta({ v, digits = 1, suffix = '%', badge = false, label, good = 'up' }: { v: number | null | undefined; digits?: number; suffix?: string; badge?: boolean; label?: string; good?: Good }) {
  const d = delta(v, digits, suffix, good);
  if (d.text === '—') return <span className="muted">—</span>;
  return badge
    ? <span className={`delta${d.cls === 'dn' ? ' dn' : d.cls === 'muted' ? ' flat' : ''}`}>{d.text}{label && <span className="muted" style={{ marginLeft: 4 }}>{label}</span>}</span>
    : <span className={d.cls}>{d.text}{label && <span className="muted"> {label}</span>}</span>;
}

/* ---------- card with question title + takeaway + actions ---------- */
export function Card({ title, takeaway, actions, legend, children, foot, className, style, id }: { title?: ReactNode; takeaway?: ReactNode; actions?: ReactNode; legend?: ReactNode; children?: ReactNode; foot?: ReactNode; className?: string; style?: CSSProperties; id?: string }) {
  return (
    <div className={`card ${className ?? ''}`} style={style} id={id}>
      {(title || actions) && (
        <div className="card-head">
          <div className="stack" style={{ gap: 6, minWidth: 0, flex: '1 1 320px' }}>
            {title && <h3 className="h3">{title}</h3>}
            {takeaway && <p className="takeaway">{takeaway}</p>}
          </div>
          {actions}
        </div>
      )}
      {legend}
      {children}
      {foot && <p className="small">{foot}</p>}
    </div>
  );
}

/** Link · PNG · CSV icon group for a chart card: CSV from `csv` (the panel data) when given, else the API JSON link. */
export function ChartActions(props: { api?: string; name: string; csv?: ChartActionsCsv }) {
  return <ChartActionsClient {...props} />;
}

/* ---------- callout ---------- */
export function Callout({ title, children, tone = 'info' }: { title: ReactNode; children: ReactNode; tone?: 'info' | 'warn' }) {
  return (
    <div className={`callout${tone === 'warn' ? ' warn' : ''}`}>
      <span className="ic"><Icon name={tone === 'warn' ? 'warn' : 'info'} size={18} /></span>
      <b style={{ color: 'var(--value)', font: '600 13px var(--mono)' }}>{title}</b>
      <div className="note">{children}</div>
    </div>
  );
}

/* ---------- folded methodology ---------- */
export function More({ summary, children, open = false }: { summary: ReactNode; children: ReactNode; open?: boolean }) {
  return (
    <details className="more" open={open}>
      <summary>{summary}</summary>
      <div className="stack note" style={{ maxWidth: 'none' }}>{children}</div>
    </details>
  );
}

/* ---------- read-next tiles ---------- */
export type TileItem = { href: string; title: string; desc?: string; value?: ReactNode };
export function Tiles({ items, title = 'Read next' }: { items: TileItem[]; title?: string }) {
  return (
    <Section title={title}>
      <div className="tiles">
        {items.map((t) => (
          <Link key={t.href} className="tile" href={t.href}>
            <span className="stack" style={{ gap: 4 }}><span className="n">{t.title}</span>{t.desc && <span className="d">{t.desc}</span>}</span>
            <span className="spread"><span className="v">{t.value ?? ''}</span><Icon name="arrow-right" size={14} /></span>
          </Link>
        ))}
      </div>
    </Section>
  );
}

/* ---------- legend ---------- */
export function Legend({ items }: { items: { label: ReactNode; color: string; line?: boolean; dashed?: boolean }[] }) {
  return (
    <div className="legend">
      {items.map((it, i) => (
        <span key={i}>
          <i className={it.line ? 'ln' : 'sw'} style={{ background: it.dashed ? `repeating-linear-gradient(90deg, ${it.color} 0 4px, transparent 4px 7px)` : it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ---------- 100% stacked bar + its key ---------- */
export type StackPart = { key: string; value: number; color: string; label?: string; display?: string };
const sharePct = (p: number) => (p > 0 && p < 0.05 ? '<0.1%' : `${num(p, 1)}%`);
const stackRows = (parts: StackPart[], fmt?: (v: number) => string) => {
  const live = parts.filter((p) => p.value > 0);
  const total = live.reduce((a, p) => a + p.value, 0) || 1;
  return live.map((p) => ({ ...p, name: p.label ?? p.key, share: (p.value / total) * 100, shown: p.display ?? (fmt ? fmt(p.value) : undefined) }));
};
const tipText = (r: { name: string; share: number; shown?: string }) => `${r.name} · ${sharePct(r.share)}${r.shown ? ` · ${r.shown}` : ''}`;

/** Key row for a stacked bar, in segment order: swatch · label · % · value. Reuse it under a hand-rolled bar. Zero parts are dropped. */
export function StackKey({ parts, fmt, hidden = false }: { parts: StackPart[]; fmt?: (v: number) => string; hidden?: boolean }) {
  return (
    <ul className="sk" aria-hidden={hidden || undefined}>
      {stackRows(parts, fmt).map((r) => (
        <li key={r.key}><i className="sw" style={{ background: r.color }} />{r.name}<b>{sharePct(r.share)}</b>{r.shown && <span className="muted">{r.shown}</span>}</li>
      ))}
    </ul>
  );
}

/** One segment of a stacked bar: hover or keyboard focus shows the tooltip; the label is also its accessible name. */
export function StackSeg({ text, color, flex, width, mid }: { text: string; color: string; flex?: number; width?: string; mid: number }) {
  return (
    <span className="sb-seg" role="listitem" tabIndex={0} aria-label={text} style={{ background: color, ...(width ? { width } : { flex: `${flex} 0 0` }) }}>
      <span className={`sb-tip${mid < 0.4 ? ' l' : mid > 0.6 ? ' r' : ''}`} aria-hidden="true">{text}</span>
    </span>
  );
}

/** 100% stacked bar with its key underneath (`legend={false}` only where the page already shows an equivalent visible key).
 *  `fmt` (or a part's `display`) adds the value to the key and tooltip. */
export function StackBar({ parts, height = 26, label, legend = true, fmt }: { parts: StackPart[]; height?: number; label: string; legend?: boolean; fmt?: (v: number) => string }) {
  const rows = stackRows(parts, fmt);
  let acc = 0;
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="sb" role="list" aria-label={label} style={{ height }}>
        {rows.map((r) => { const mid = (acc + r.share / 2) / 100; acc += r.share; return <StackSeg key={r.key} text={tipText(r)} color={r.color} flex={Math.max(r.share, 0.4)} mid={mid} />; })}
      </div>
      {legend && <StackKey parts={parts} fmt={fmt} hidden />}
    </div>
  );
}

/* ---------- progress gate (label outside the fill) ---------- */
export function Progress({ value, max = 100, label, scale = true }: { value: number; max?: number; label: string; scale?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="bar-track" role="img" aria-label={label} style={{ height: 14 }}><span style={{ width: `${pct}%`, boxShadow: 'var(--glow)' }} /></div>
      {scale && <div className="spread small mono"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>}
    </div>
  );
}

/* ---------- table ---------- */
export type Col<T> = { key: string; label: ReactNode; render: (row: T) => ReactNode; align?: 'left' | 'right'; className?: string };
export function Table<T>({ cols, rows, caption, maxHeight, rowKey }: { cols: Col<T>[]; rows: T[]; caption?: string; maxHeight?: number; rowKey: (r: T, i: number) => string }) {
  return (
    <div className="tbl-wrap" style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
      <table className="t">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead><tr>{cols.map((c) => <th key={c.key} scope="col" style={c.align ? { textAlign: c.align } : undefined}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)}>{cols.map((c) => <td key={c.key} className={c.className} style={c.align ? { textAlign: c.align } : undefined}>{c.render(r)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
