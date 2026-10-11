'use client';

import { useId, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

/** Sign-in / subscribe gate. UI only: there is no auth backend yet, so a submit shows a neutral message. */
export function ProGate() {
  const id = useId();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form className="stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); setMsg('Sign-in is temporarily unavailable.'); }}>
      <h2 className="h3">Sign in to Pro</h2>
      <div className="stack" style={{ gap: 6 }}>
        <label className="kicker" htmlFor={`${id}-e`}>Email</label>
        <div className="field"><input id={`${id}-e`} type="email" autoComplete="email" required placeholder="you@example.com" /></div>
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <label className="kicker" htmlFor={`${id}-p`}>Password</label>
        <div className="field"><input id={`${id}-p`} type="password" autoComplete="current-password" required /></div>
      </div>
      <button type="submit" className="btn primary" style={{ height: 40 }}><Icon name="shield" size={15} />Sign in</button>
      {msg && <p className="note" role="status">{msg}</p>}
      <div className="stack" style={{ gap: 8, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
        <p className="note">No account yet? Subscriptions open when the Signals channel leaves testing.</p>
        <button type="button" className="btn" disabled aria-disabled="true" style={{ height: 40, opacity: 0.7, cursor: 'not-allowed' }}>Subscribe · not open yet</button>
      </div>
    </form>
  );
}
