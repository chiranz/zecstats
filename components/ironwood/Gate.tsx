import type { ReactNode } from 'react';
import s from './Gate.module.css';

/** Migration gate: a progress track with quarter marks, a pinned label above the fill edge (never on the fill) and a scale. */
export function Gate({ pct, pinLabel, label, size = 'lg', children }: { pct: number; pinLabel: string; label: string; size?: 'lg' | 'sm'; children?: ReactNode }) {
  const w = `${Math.max(0, Math.min(100, pct))}%`;
  return (
    <div className={s.gate}>
      <div className={s.pin} aria-hidden="true"><span style={{ left: w }}>{pinLabel}</span></div>
      <div className={`${s.track}${size === 'sm' ? ` ${s.sm}` : ''}`} role="img" aria-label={label}>
        <span style={{ width: w }} />
        <b style={{ left: '25%' }} /><b style={{ left: '50%' }} /><b style={{ left: '75%' }} />
      </div>
      <div className={s.scale} aria-hidden="true">
        <span style={{ left: 0 }}>0%</span><span style={{ left: '25%' }}>25%</span><span style={{ left: '50%' }}>50%</span><span style={{ left: '75%' }}>75%</span><span style={{ left: '100%' }}>100%</span>
      </div>
      {children}
    </div>
  );
}
