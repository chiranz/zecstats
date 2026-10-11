'use client';

import { useEffect, useRef, useState } from 'react';
import { num } from '@/lib/format';
import { replaceQuery } from '@/components/tools/browser';

export type WhatIfAsset = { id: string; label: string; size: number; source: string };
const SHARES = [1, 2, 5, 10];
const money = (v: number) => (v >= 1e12 ? `$${num(v / 1e12, 1)}T` : v >= 1e9 ? `$${num(v / 1e9, 1)}B` : v >= 100 ? `$${num(v, 0)}` : `$${num(v, 2)}`);

export function WhatIf({ assets, zecUsd, mined, max }: { assets: WhatIfAsset[]; zecUsd: number; mined: number; max: number }) {
  const [asset, setAsset] = useState('gold');
  const [share, setShare] = useState(1);
  const [draft, setDraft] = useState('1');
  const [basis, setBasis] = useState<'max' | 'mined'>('max');
  const ready = useRef(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const a = q.get('asset'), p = Number(q.get('share'));
    if (a && assets.some((x) => x.id === a)) setAsset(a);
    if (p > 0 && p <= 100) { setShare(p); setDraft(String(p)); }
    if (q.get('basis') === 'mined') setBasis('mined');
    ready.current = true;
  }, [assets]);
  useEffect(() => {
    if (!ready.current) return;
    const q = new URLSearchParams();
    if (asset !== 'gold') q.set('asset', asset);
    if (share !== 1) q.set('share', String(share));
    if (basis !== 'max') q.set('basis', basis);
    replaceQuery(q);
  }, [asset, share, basis]);

  const coins = basis === 'max' ? max : mined;
  const a = assets.find((x) => x.id === asset)!;
  const per = (size: number, pct: number) => (size * pct) / 100 / coins;
  const v = per(a.size, share);
  const mult = v / zecUsd;
  const apply = () => { const p = Number(draft); if (p > 0 && p <= 100) setShare(Math.round(p * 100) / 100); else setDraft(String(share)); };
  const cols = SHARES.includes(share) ? SHARES : [...SHARES, share].sort((x, y) => x - y);

  return (
    <>
      <section className="hero" aria-label="Result">
        <div className="row" style={{ gap: 12 }}>
          <span className="lbl small mono" id="wi-a">IF ZCASH REACHED</span>
          <div className="seg" role="group" aria-labelledby="wi-a">{assets.map((x) => <button key={x.id} type="button" aria-pressed={asset === x.id} onClick={() => setAsset(x.id)}>{x.label}</button>)}</div>
          <div className="seg" role="group" aria-label="Share">{SHARES.map((p) => <button key={p} type="button" aria-pressed={share === p} onClick={() => { setShare(p); setDraft(String(p)); }}>{p}%</button>)}</div>
          <label className="field" style={{ height: 34, width: 120, padding: '0 10px' }}>
            <span className="sr-only">Custom share, percent</span>
            <input value={draft} inputMode="decimal" onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ''))} onBlur={apply} onKeyDown={(e) => { if (e.key === 'Enter') apply(); }} aria-label="Custom share in percent" />
            <span className="small">%</span>
          </label>
        </div>
        <div className="stack" style={{ gap: 10 }}>
          <p className="mono" style={{ color: 'var(--text-2)', fontSize: 15 }}>{num(share, share % 1 ? 2 : 0)}% of {a.label.toLowerCase()} ({money(a.size)}) would make one ZEC worth</p>
          <p className="figure">{money(v)}</p>
          <p className="row" style={{ gap: 10 }}>
            <span className={`delta${mult < 1 ? ' dn' : ''}`}>{mult >= 1 ? '▲' : '▼'} {num(mult, mult < 10 ? 1 : 0)}× today</span>
            <span className="note">against ${num(zecUsd, 2)} for one ZEC on the last daily close, dividing by {basis === 'max' ? 'all 21,000,000 ZEC that will ever exist' : `the ${num(mined)} ZEC mined so far`}.</span>
          </p>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <span className="small mono" id="wi-b">DIVIDE BY</span>
          <div className="seg" role="group" aria-labelledby="wi-b">
            <button type="button" aria-pressed={basis === 'max'} onClick={() => setBasis('max')}>21M · every coin ever</button>
            <button type="button" aria-pressed={basis === 'mined'} onClick={() => setBasis('mined')}>{num(mined / 1e6, 2)}M · mined so far</button>
          </div>
        </div>
      </section>

      <div className="card">
        <div className="stack" style={{ gap: 6 }}>
          <h2 className="h3">What would one ZEC be worth at each share?</h2>
          <p className="takeaway">Each cell is that share of the total, divided by {basis === 'max' ? '21M' : `${num(mined / 1e6, 2)}M`} ZEC. Cells <b>below today&apos;s ${num(zecUsd, 0)}</b> are marked ▼: a share that small is already exceeded.</p>
        </div>
        <div className="tbl-wrap">
          <table className="t">
            <caption className="sr-only">Price of one ZEC if Zcash reached a share of each asset class</caption>
            <thead><tr><th scope="col">If Zcash reached</th><th scope="col">Total size</th>{cols.map((p) => <th key={p} scope="col">{num(p, p % 1 ? 2 : 0)}% of it</th>)}</tr></thead>
            <tbody>
              {assets.map((x) => (
                <tr key={x.id} style={x.id === asset ? { background: 'var(--accent-wash)' } : undefined}>
                  <td className="l"><a href={`#src-${x.id}`}>{x.label}</a></td>
                  <td>{money(x.size)}</td>
                  {cols.map((p) => {
                    const c = per(x.size, p);
                    const below = c < zecUsd;
                    return <td key={p} style={p === share && x.id === asset ? { outline: '1px solid var(--accent)', outlineOffset: -1 } : undefined}><span className={below ? 'dn' : undefined}>{below ? '▼ ' : ''}{money(c)}</span><span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>{num(c / zecUsd, c / zecUsd < 10 ? 1 : 0)}×</span></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small">× = multiple of today&apos;s price. This is division, and nothing else: nothing on this page makes any outcome more or less likely, and none of it is a forecast or advice.</p>
      </div>
    </>
  );
}
