'use client';

import { useState } from 'react';
import { WORLD_DOTS, WORLD_H, WORLD_W } from './worldDots';
import { useWidth } from '@/components/tools/useWidth';
import s from './network.module.css';

export type MapBubble = {
  cc: string; country: string; x: number; y: number; nodes: number;
  status: { at_tip: number; out_of_sync: number; unknown_sync: number };
  clients: Record<string, number>;
};
type Key = { key: string; label: string; color: string; ring?: boolean };

const STATUS: Key[] = [
  { key: 'at_tip', label: 'At tip', color: 'var(--up)' },
  { key: 'out_of_sync', label: 'Out of sync', color: 'var(--warn)' },
  { key: 'unknown_sync', label: 'Height unknown', color: 'var(--unknown)' },
];

export function NodeMap({ bubbles, unreachable, clients, totals }: {
  bubbles: MapBubble[];
  unreachable: { x: number; y: number }[];
  clients: Key[];
  totals: Record<string, number>;
}) {
  const [mode, setMode] = useState<'sync' | 'software'>('sync');
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(['unreachable']));
  const [hover, setHover] = useState<string | null>(null);
  // the map scales with its box, so text is sized in map units to land at 12px+ on screen (k = map units per px)
  const [box, boxW] = useWidth<HTMLDivElement>(WORLD_W);
  const k = WORLD_W / boxW;
  const keys = mode === 'sync' ? STATUS : clients;

  const toggle = (k: string) => setHidden((h) => { const n = new Set(h); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const partsOf = (b: MapBubble) => keys.map((k) => ({ ...k, n: mode === 'sync' ? b.status[k.key as keyof MapBubble['status']] : b.clients[k.key] ?? 0 })).filter((p) => !hidden.has(p.key) && p.n > 0);
  const total = (b: MapBubble) => partsOf(b).reduce((a, p) => a + p.n, 0);
  const radius = (n: number) => (n <= 1 ? 4.6 : 6 + Math.sqrt(n) * 3.4);
  const hb = bubbles.find((b) => b.cc === hover);
  const reachable = bubbles.reduce((a, b) => a + b.nodes, 0);

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className={s.mapControls}>
        <div className={s.lgf} role="group" aria-label={mode === 'sync' ? 'Show or hide nodes by sync status' : 'Show or hide nodes by software'}>
          {keys.map((k) => (
            <button key={k.key} className="chip" type="button" aria-pressed={!hidden.has(k.key)} onClick={() => toggle(k.key)}>
              <i className={s.ring} style={k.ring ? { boxShadow: `inset 0 0 0 2px ${k.color}` } : { background: k.color }} />
              <span className={s.lblx}>{k.label}</span> <b>{(mode === 'sync' ? totals[k.key] : totals[`client:${k.key}`]) ?? 0}</b>
            </button>
          ))}
          {mode === 'sync' && (
            <button className="chip" type="button" aria-pressed={!hidden.has('unreachable')} onClick={() => toggle('unreachable')}>
              <i className={s.ring} style={{ boxShadow: 'inset 0 0 0 1.5px var(--muted)' }} />
              <span className={s.lblx}>Not reachable</span> <b>{totals.unreachable}</b>
            </button>
          )}
        </div>
        <div className="seg" role="group" aria-label="Colour nodes by">
          <button type="button" aria-pressed={mode === 'sync'} onClick={() => { setMode('sync'); setHidden(new Set(['unreachable'])); }}>Sync status</button>
          <button type="button" aria-pressed={mode === 'software'} onClick={() => { setMode('software'); setHidden(new Set()); }}>Node software</button>
        </div>
      </div>
      <p className="small" style={{ marginTop: -4 }}>Click a {mode === 'sync' ? 'status' : 'client'} to show or hide it · bubble size = nodes · hover or tab to a bubble for its breakdown</p>
      <div ref={box} className={`chart ${s.map}`} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} role="img" aria-label={`World map, 60°S to 75°N, with one bubble per country sized by reachable nodes (${reachable} in all). Largest: ${bubbles.slice(0, 6).map((b) => `${b.country} ${b.nodes}`).join(', ')}.`}>
          <path d={WORLD_DOTS} stroke="var(--line-strong)" strokeOpacity={0.45} strokeWidth={2.6} strokeLinecap="round" fill="none" />
          {mode === 'sync' && !hidden.has('unreachable') && (
            <g aria-hidden="true">
              {unreachable.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.4} fill="none" stroke="var(--muted)" strokeWidth={1} opacity={0.7} />)}
            </g>
          )}
          {[...bubbles].sort((a, b) => b.nodes - a.nodes).map((b) => {
            const parts = partsOf(b);
            const n = total(b);
            if (!n) return null;
            const r = radius(n);
            const on = hover === b.cc;
            if (n === 1) {
              const p = parts[0];
              return (
                <g key={b.cc} tabIndex={0} role="button" aria-label={`${b.country}: 1 node, ${p.label.toLowerCase()}`} onPointerEnter={() => setHover(b.cc)} onFocus={() => setHover(b.cc)} onBlur={() => setHover(null)} className={s.bub}>
                  <circle cx={b.x} cy={b.y} r={on ? 6 : r} fill={p.ring ? 'var(--card)' : p.color} stroke={p.ring ? p.color : 'var(--card)'} strokeWidth={p.ring ? 2 : 1.5} />
                </g>
              );
            }
            let off = 0;
            const rr = r - 2.6;
            return (
              <g key={b.cc} tabIndex={0} role="button" aria-label={`${b.country}: ${n} nodes — ${parts.map((p) => `${p.n} ${p.label.toLowerCase()}`).join(', ')}`} onPointerEnter={() => setHover(b.cc)} onFocus={() => setHover(b.cc)} onBlur={() => setHover(null)} className={s.bub}>
                <circle cx={b.x} cy={b.y} r={r} fill="var(--raised)" fillOpacity={0.92} stroke={on ? 'var(--value)' : 'none'} strokeWidth={1.5} />
                {parts.map((p) => {
                  const len = (p.n / n) * 100;
                  const el = <circle key={p.key} cx={b.x} cy={b.y} r={rr} fill="none" stroke={p.color} strokeWidth={3.6} pathLength={100} strokeDasharray={`${Math.max(0, len - (parts.length > 1 ? 1.2 : 0))} ${100 - len + (parts.length > 1 ? 1.2 : 0)}`} strokeDashoffset={-off} transform={`rotate(-90 ${b.x} ${b.y})`} />;
                  off += len;
                  return el;
                })}
                {rr * 2 >= (n >= 10 ? 20 : 13) * k && <text x={b.x} y={b.y} dy="0.36em" textAnchor="middle" className={s.bubN} style={{ fontSize: (n >= 10 ? 13 : 12) * k }}>{n}</text>}
              </g>
            );
          })}
          <text x={8} y={WORLD_H - 8} className={s.lat} style={{ fontSize: 12 * k }}>60°S</text>
          <text x={8} y={14 * k} className={s.lat} style={{ fontSize: 12 * k }}>75°N</text>
        </svg>
        {hb && (
          <div className="tip" aria-hidden="true" style={{ left: `min(calc(${(hb.x / WORLD_W) * 100}% + 18px), calc(100% - 230px))`, top: `calc(${(hb.y / WORLD_H) * 100}% + 12px)`, minWidth: 210, pointerEvents: 'none' }}>
            <b>{hb.country}</b>
            <span className="muted" style={{ marginTop: -3 }}>{hb.nodes} node{hb.nodes === 1 ? '' : 's'} · {((hb.nodes / reachable) * 100).toFixed(0)}% of reachable</span>
            {STATUS.map((k) => (
              <span key={k.key} className={s.trow}><i className="sw" style={k.ring ? { boxShadow: `inset 0 0 0 1.5px ${k.color}` } : { background: k.color }} />{k.label}<b>{hb.status[k.key as keyof MapBubble['status']]}</b></span>
            ))}
            <span className={s.tdiv} />
            <span className="muted">Clients seen</span>
            <span className={s.tcl}>
              {clients.filter((c) => (hb.clients[c.key] ?? 0) > 0).map((c) => <span key={c.key}><i className={s.dot} style={{ background: c.color }} />{c.label} {hb.clients[c.key]}</span>)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
