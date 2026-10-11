import type { Metadata } from 'next';
import Link from 'next/link';
import { Masthead } from '@/components/chrome/Masthead';
import { Callout, Tiles } from '@/components/ui/blocks';
import { Icon } from '@/components/ui/Icon';
import { ProGate } from '@/components/tools/ProGate';
import t from '@/components/tools/tools.module.css';
import { SIGNAL_CALLS } from '@/lib/data/tools';
import { dateLong } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata('/pro');

const UNLOCKS = [
  { icon: 'bolt', title: 'A message when the model changes its mind', body: 'Not hourly, not daily. The model is checked every hour and only speaks when it has moved far enough to mean it and stayed there.' },
  { icon: 'clock', title: 'One summary a day', body: 'Where the model stands, what it is weighting, and the price move since yesterday. It is allowed to say that nothing happened.' },
  { icon: 'check', title: 'Every number can be checked', body: 'Each message names the last full day behind it, the block height it was worked out through, and where the price came from.' },
  { icon: 'chart', title: 'The research page', body: 'The experimental “ZEC Trading Signals” research tool, kept behind a password.' },
];

export default function ProPage() {
  const latest = SIGNAL_CALLS[0];
  return (
    <>
      <Masthead
        title={<>ZEC Stats Pro<span className={t.beta}>BETA</span></>}
        lede="Everything else on ZEC Stats is free. Pro is the paid part of Signals: the live messages as they are sent, a daily summary, and the research page behind them."
      />
      <div className="split">
        <section className="stack" style={{ gap: 16 }} aria-labelledby="unlock-h">
          <h2 className="h2" id="unlock-h" style={{ fontSize: 18 }}>What Pro unlocks</h2>
          <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 10 }}>
            {UNLOCKS.map((u) => (
              <li key={u.title} className="card" style={{ flexDirection: 'row', gap: 14, padding: 16 }}>
                <span style={{ color: 'var(--accent)', flex: 'none', marginTop: 2 }}><Icon name={u.icon} size={18} /></span>
                <span className="stack" style={{ gap: 4 }}><b className="h3">{u.title}</b><span className="note">{u.body}</span></span>
              </li>
            ))}
          </ul>
          <p className="note">The free record stays public either way: every call, word for word, on <Link href="/signals">Signals</Link> — the latest from {dateLong(latest.at)} — published as it is decided until the channel opens, and a week late after that.</p>
        </section>
        <div className="card">
          <ProGate />
        </div>
      </div>
      <Callout title="It is research, not advice." tone="warn">
        A rule built from one asset&apos;s past, on one node&apos;s data. It has been wrong before, and the Signals page shows when. This page is a design for the gate only: there is no real sign-in, account or payment behind it.
      </Callout>
      <Tiles
        items={[
          { href: '/signals', title: 'Signals record', desc: 'Every call so far and what acting on it would have done.', value: `${SIGNAL_CALLS.length} calls` },
          { href: '/tools', title: 'Methodology', desc: 'Where the data the model reads comes from.', value: 'Zebra full node' },
          { href: '/donate', title: 'Donate', desc: 'Support the free side of the site instead.', value: '$300 / month' },
          { href: '/metrics', title: 'Metrics table', desc: 'The free headline numbers, with their 28-day and 12-month change.', value: '43 metrics' },
        ]}
      />
    </>
  );
}
