'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import type { NavData } from '@/lib/data/nav';
import { usePageCadence } from './cadence';
import { useDisclosure } from './useDisclosure';

/** Node status and data freshness, said once for the whole site, in the top bar. */
export function StatusPill({ fresh }: { fresh: NavData['fresh'] }) {
  const d = useDisclosure();
  const cadence = usePageCadence();
  const dot = `st-dot${fresh.stateCls ? ` ${fresh.stateCls}` : ''}`;
  return (
    <div className="st-wrap" {...d.wrap}>
      <button {...d.button} className="st-pill" aria-label={`Node: ${fresh.stateText.toLowerCase()}, block ${fresh.height}, data through ${fresh.through}. Details`}>
        <i className={dot} aria-hidden="true" />
        <span className="st-t" aria-hidden="true">data through {fresh.throughShort}</span>
      </button>
      {d.open && (
        <div id={d.id} className="st-pop" role="region" aria-label="Data freshness">
          <dl>
            <div><dt>Node</dt><dd><i className={dot} aria-hidden="true" />{fresh.stateText} · Zebra full node</dd></div>
            <div><dt>Block</dt><dd className="num">{fresh.height}</dd></div>
            <div><dt>Data through</dt><dd>{fresh.through} · updates daily</dd></div>
            {cadence && <div><dt>This page</dt><dd>{cadence}</dd></div>}
          </dl>
          <Link href="/node" className="st-link" onClick={() => d.setOpen(false)}>Node status <Icon name="arrow-right" size={12} /></Link>
        </div>
      )}
    </div>
  );
}
