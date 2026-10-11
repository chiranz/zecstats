import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { More, Section, Tiles } from '@/components/ui/blocks';
import { CopyButton } from '@/components/tools/CopyButton';
import s from './page.module.css';
import { DONATE, getPriceArrays } from '@/lib/data/tools';
import { getFreshness, getLive } from '@/lib/data/snapshot';
import { dateLong, num, usd } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';
import { SectionLd } from '@/components/seo/SectionLd';

export const metadata: Metadata = pageMetadata('/donate');

export default async function DonatePage() {
  const [live, prices, f] = await Promise.all([getLive(), getPriceArrays(), getFreshness()]);
  const px = live.zec_usd;
  const chunks = DONATE.address.match(/.{1,6}/g) ?? [DONATE.address];
  return (
    <>
      <SectionLd path="/donate" />
      <Masthead
        title="Keep the node running"
        lede={<>ZEC Stats is free. Running the Zebra node, the servers and the tooling behind it costs about <b>{usd(DONATE.monthlyCostUsd, 0)} a month</b> — {num(DONATE.monthlyCostUsd / px, 2)} ZEC at today&apos;s ${num(px, 2)}. If the site is useful to you, a donation of any size helps cover it.</>}
      />
      <section className={`hero ${s.give}`} aria-labelledby="addr-h">
        <div className="stack" style={{ gap: 14, minWidth: 0 }}>
          <h2 className="kicker" id="addr-h">Donation address · unified (shielded)</h2>
          <p className={s.addr} aria-label={`Zcash unified address: ${DONATE.address}`}>
            {chunks.map((c, i) => <span key={i}>{c}</span>)}
          </p>
          <div className="row">
            <CopyButton text={DONATE.address} label="Copy address" done="Address copied" className="btn primary" />
            <span className="small">Grouped in sixes so you can check it against your wallet; copy always takes the whole address.</span>
          </div>
          <p className="note">Paste it into any Zcash wallet and send any amount. A unified address receives into a shielded pool, so the donation is private by default.</p>
        </div>
      </section>
      <Section id="cover" title="What would a donation cover?">
        <div className={s.tiers}>
          {DONATE.tiers.map((tier) => (
            <div key={tier.usd} className={s.tier}>
              <span className="kicker">{tier.label}</span>
              <span className="figure md">{usd(tier.usd, 0)}</span>
              <span className="mono" style={{ color: 'var(--text-2)' }}>≈ {num(tier.usd / px, 2)} ZEC</span>
            </div>
          ))}
        </div>
        <p className="small">For scale only — send whatever you like to the address above. ZEC equivalents at the live price, ${num(px, 2)} ({dateLong(prices.lastComplete)} close: ${num(prices.zec.at(-1)!, 2)}).</p>
      </Section>
      <More summary="Where the money goes">
        <p>The site runs its own Zebra full node (now at block {num(f.height)}) and computes every chain number from it rather than copying an exchange API. The monthly cost is the node&apos;s server, the database and services behind the charts, and the tooling that keeps them updating daily.</p>
        <p>There is no progress bar here because the site does not publish what it receives; a shielded address does not reveal it either.</p>
      </More>
      <Tiles
        items={[
          { href: '/node', title: 'Node status', desc: 'The Zebra node your donation keeps running, and how fresh its data is.', value: `Block ${num(f.height)}` },
          { href: '/tools', title: 'Methodology', desc: 'How every number on the site is produced.', value: '5 principles' },
          { href: '/privacy', title: 'Privacy hub', desc: 'What the shielded pools hold, and where ZEC is moving.', value: 'Shielded pools' },
          { href: '/news', title: 'News', desc: 'What the node noticed on its own today.', value: 'Auto-written feed' },
        ]}
      />
    </>
  );
}
