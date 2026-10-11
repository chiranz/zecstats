'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

/** Copies `text`, or the current URL (whose query holds the page state) when no text is given. */
export function CopyButton({ text, label = 'Copy link', done = 'Copied', className = 'btn', size = 15 }: { text?: string; label?: string; done?: string; className?: string; size?: number }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text ?? window.location.href); setOk(true); } catch { setOk(false); }
    setTimeout(() => setOk(null), 1800);
  };
  return (
    <button type="button" className={className} onClick={copy} aria-live="polite">
      <Icon name={ok ? 'check' : 'link'} size={size} />
      {ok ? done : ok === false ? 'Copy blocked — select the text' : label}
    </button>
  );
}
