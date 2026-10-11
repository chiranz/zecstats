import type { Metadata } from 'next';
import Link from 'next/link';
import { Masthead } from '@/components/chrome/Masthead';
import { Kpi, KpiBand, More, Section, Tiles } from '@/components/ui/blocks';
import s from './page.module.css';
import { toolGroups } from '@/lib/site';
import { getChartCatalogue } from '@/lib/data/tools';
import { getFreshness } from '@/lib/data/snapshot';
import { manifest } from '@/lib/data/core';
import { dateLong, num } from '@/lib/format';

export const metadata: Metadata = { title: 'Tools & methodology', description: 'Every tool on ZEC Stats, grouped by the question it answers, and how the numbers behind them are produced.' };

const PRINCIPLES = [
  { h: 'Chain data comes from a full node we run.', p: 'A Zebra node, not a third-party API. Every supply, pool balance and transaction figure on this site is read from it directly.' },
  { h: 'Supply and pool balances are consensus-verified, not derived.', p: 'They are read from the node’s own per-block snapshots (chainSupply and valuePools) rather than reconstructed from a block-reward formula. A formula gets slow-start, Blossom and NU6 wrong; the node cannot, because the network agreed on those numbers.' },
  { h: 'Price is the one external input.', p: 'Price history is Coin Metrics; the live price is CoinGecko, falling back to Coinbase and then Kraken. Price is not an on-chain fact. When the live price stops moving, the card that shows it says how old it is rather than passing it off as now.' },
  { h: 'Days are complete days.', p: 'The current UTC day is still being written, so it is left out of daily series rather than drawn as a partial bar that looks like a collapse in activity. Pages say “data through” the last complete day.' },
  { h: 'Estimates say so.', p: 'Shielded-pool cost basis, for instance, cannot be exact — individual notes are private — so those charts describe the model they use instead of implying precision they do not have.' },
];

export default async function ToolsPage() {
  const [charts, f, man] = await Promise.all([getChartCatalogue(), getFreshness(), manifest()]);
  const toolCount = toolGroups.reduce((a, g) => a + g.links.length, 0);
  const endpoints = Object.keys(man.endpoints).length;
  return (
    <>
      <Masthead
        crumbs={[{ label: 'Tools & methodology' }]}
        title="Every tool, and how the numbers are made"
        lede={`${toolCount} tools in ${toolGroups.length} groups, by the question each answers, plus all ${charts.length} charts. Every figure comes from our own Zebra node, except price.`}
      />
      <KpiBand label="The site in four numbers">
        <Kpi k="Tools" v={num(toolCount)} s={`in ${toolGroups.length} groups`} href="#index" />
        <Kpi k="Charts" v={num(charts.length)} s="grouped by question" href="/charts" />
        <Kpi k="Data endpoints" v={num(endpoints)} s="the same JSON the pages use" />
        <Kpi k="Node height" v={num(f.height)} s={`data through ${dateLong(f.dataThrough)}`} href="/node" />
      </KpiBand>

      <Section id="index" title="Which tool answers your question?">
        <div className={s.groups}>
          {toolGroups.map((g) => (
            <section key={g.title} className={`card ${s.group}`} aria-labelledby={`tg-${g.title}`}>
              <h3 className="kicker" id={`tg-${g.title}`}>{g.title}</h3>
              <ul className={s.links}>
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={s.link}>
                      <b>{l.label}{l.tag && <span className="tag">{l.tag}</span>}</b>
                      {l.desc && <span>{l.desc}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <Link href="/charts" className={`card ${s.group} ${s.charts}`}>
            <span className="kicker">Charts</span>
            <b className="h3">All {charts.length} charts →</b>
            <span className="note">Grouped by the question each answers, with a sparkline and the latest value for every one.</span>
          </Link>
        </div>
      </Section>

      <Section id="methodology" title="How are these numbers produced?">
        <ol className={s.principles}>
          {PRINCIPLES.map((p, i) => (
            <li key={p.h}><span className={s.n} aria-hidden="true">{i + 1}</span><p><b>{p.h}</b> {p.p}</p></li>
          ))}
        </ol>
      </Section>

      <More summary="Data access and freshness">
        <p>Every page reads the same JSON routes the live site serves under <span className="mono">/api/&lt;name&gt;</span> ({endpoints} of them); chart cards link to the route behind them so the numbers can be downloaded and checked.</p>
        <p>This redesign concept reads a capture of those routes taken {dateLong(man.capturedAt)} ({new Date(man.capturedAt).toISOString().slice(11, 16)} UTC). Chain data runs through {dateLong(f.dataThrough)}, the last complete UTC day; the node was at block {num(f.height)}.</p>
      </More>
      <Tiles
        items={[
          { href: '/charts', title: 'All charts', desc: 'The full index of every chart on the site.', value: `${charts.length} charts` },
          { href: '/node', title: 'Node status', desc: 'Our Zebra node and how fresh its data is.', value: f.synced ? 'Synced' : 'Catching up' },
          { href: '/metrics', title: 'Metrics table', desc: 'Every headline number and its change, in one table.', value: '43 metrics' },
          { href: '/donate', title: 'Donate', desc: 'What it costs to keep the node running.', value: '$300 / month' },
        ]}
      />
    </>
  );
}
