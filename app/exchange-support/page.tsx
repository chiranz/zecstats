import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { Callout, Card, ChartActions, Kpi, KpiBand, More, Section, Tiles } from '@/components/ui/blocks';
import { ShareBar } from '@/components/reports/BarList';
import { ExchangeTable, type CountryRow } from '@/components/crosschain/ExchangeTable';
import { getExchangeCoverage } from '@/lib/data/crosschain';
import { dateLong, num, pct } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';
import { SectionLd } from '@/components/seo/SectionLd';

export const metadata: Metadata = pageMetadata('/exchange-support');

export default async function ExchangeSupportPage() {
  const ex = await getExchangeCoverage();
  const C = ex.countries;
  const pop = (s: string) => C.filter((c) => c.status === s).reduce((a, c) => a + c.pop_m, 0);
  const n = (s: string) => C.filter((c) => c.status === s).length;
  const assessed = C.reduce((a, c) => a + c.pop_m, 0);
  const unassessed = Math.max(0, ex.world_pop_m - assessed);
  const rows: CountryRow[] = [...C].sort((a, b) => b.pop_m - a.pop_m).map((c) => ({ name: c.name, status: c.status, count: c.count, exchanges: c.exchanges, pop: c.pop_m, note: c.note }));
  const reach = new Map<string, number>();
  for (const c of C) for (const e of c.exchanges) reach.set(e, (reach.get(e) ?? 0) + 1);
  const venues = [...reach.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const local = venues.filter(([e]) => !ex.global_zec.includes(e));
  const bannedBig = rows.filter((x) => x.status === 'banned').slice(0, 3).map((x) => x.name);
  const ageDays = ex.days_since_update;
  const homeOf = (e: string) => C.filter((c) => c.exchanges.includes(e)).map((c) => c.name);

  return (
    <>
      <SectionLd path="/exchange-support" />
      <Masthead
        title="Where can you buy ZEC on a regulated exchange?"
        cadence="hand-checked monthly"
        lede={<><b className="num value">{pct(ex.access_pop_pct, 0)}</b> of the world’s population lives where a regulated exchange offers ZEC; <b className="num value">{ex.listing_zec} of {ex.exchange_count}</b> tracked exchanges list it.</>}
      >
        <p style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 'var(--measure)' }}>A conservative, hand-maintained estimate gated mostly by national policy — privacy-coin bans and crypto bans — not a legal opinion.</p>
      </Masthead>

      {ex.stale && (
        <Callout title={`Last verified ${dateLong(ex.last_updated)} — ${ageDays} day${ageDays === 1 ? '' : 's'} ago`} tone="warn">
          The country list is checked by hand about once a month, so a recent listing or ban may not be reflected yet.
        </Callout>
      )}

      <Card
        title="How much of the world can reach ZEC?"
        takeaway={<>People in <b>{n('open')}</b> countries have open access and in <b>{n('partial')}</b> partial access; <b>{n('banned')}</b> countries — including {bannedBig.join(', ')} — ban it, covering <b>{pct((pop('banned') / ex.world_pop_m) * 100, 0)}</b> of the world.</>}
        actions={<ChartActions api="exchange-coverage" name="exchange access by population" />}
        foot={`Population-weighted, ${num(ex.world_pop_m)}M people. “Partial” = tradable but restricted (licensing gaps, KYC limits or a scheduled delisting). ${num(unassessed, 0)}M people live in countries not assessed.`}
      >
        <ShareBar label={`World population by ZEC exchange access: open ${num(pop('open'))}M, partial ${num(pop('partial'))}M, banned ${num(pop('banned'))}M, not assessed ${num(unassessed)}M`} parts={[
          { key: 'open', label: `Open · ${n('open')} countries`, value: pop('open'), color: 'var(--up)', display: `${(pop('open') / 1000).toFixed(2)}B people` },
          { key: 'partial', label: `Partial · ${n('partial')}`, value: pop('partial'), color: 'var(--warn)', display: `${(pop('partial') / 1000).toFixed(2)}B people` },
          { key: 'banned', label: `Banned · ${n('banned')}`, value: pop('banned'), color: 'var(--down)', display: `${(pop('banned') / 1000).toFixed(2)}B people` },
          { key: 'na', label: 'Not assessed', value: unassessed, color: 'var(--unknown)', display: `${num(unassessed)}M people` },
        ]} />
      </Card>

      <KpiBand label="Exchange coverage">
        <Kpi k="Population with access" v={pct(ex.access_pop_pct, 0)} s="open or partial, via a regulated exchange" />
        <Kpi k="Exchanges tracked" v={ex.exchange_count} s={`${ex.listing_zec} list ZEC (${ex.pct_listing_zec}%)`} />
        <Kpi k="Countries assessed" v={C.length} s={`${n('open')} open · ${n('partial')} partial · ${n('banned')} banned`} />
        <Kpi k="Global venues" v={ex.global_zec.length} s="list ZEC and serve most countries" />
      </KpiBand>

      <Section id="countries" title="Can I buy ZEC where I live?" aside={<a className="btn" href="/api/exchange-coverage" download="zec-exchange-coverage.json">Download data</a>}>
        <ExchangeTable rows={rows} global={ex.global_zec} />
        <p className="small">Status is shown as a word, not only a colour. Exchange counts include the {ex.global_zec.length} global venues wherever they accept residents; open a count to see the list.</p>
      </Section>

      <Card
        title="Which exchanges carry ZEC in the most countries?"
        takeaway={<>The {ex.global_zec.length} global venues reach <b>{venues[0][1]}</b> countries each; the other {local.length} serve only their home market.</>}
        actions={<ChartActions api="exchange-coverage" name="exchanges by reach" />}
        foot={`Countries where each exchange is listed as serving residents with ZEC, of ${C.length} assessed. The dataset tracks ${ex.exchange_count} exchanges; ${ex.listing_zec} list ZEC, ${venues.length} of them attached to at least one country here.`}
      >
        <dl className="stack" style={{ gap: 14, margin: 0 }}>
          <div className="stack" style={{ gap: 4 }}>
            <dt className="h3">{ex.global_zec.length} global venues · <span className="mono">{venues[0][1]} countries each</span></dt>
            <dd className="note" style={{ margin: 0 }}>{ex.global_zec.join(', ')}</dd>
          </div>
          {local.length > 0 && (
            <div className="stack" style={{ gap: 4 }}>
              <dt className="h3">{local.length} home-market venues · <span className="mono">{local.every(([, k]) => k === 1) ? '1 country each' : 'a few countries each'}</span></dt>
              <dd className="note" style={{ margin: 0 }}>{local.map(([e, k]) => `${e} (${k === 1 ? homeOf(e)[0] : `${k} countries`})`).join(', ')}</dd>
            </div>
          )}
        </dl>
      </Card>

      <More summary="How access is judged">
        <p>Roughly: <b>Open</b>: crypto trading is legal and at least one regulated exchange lists ZEC for residents. <b>Partial</b>: ZEC can be traded, but with a restriction — a licensing regime that does not yet include it, local venues that have delisted it, or a dated delisting rule such as the EU’s 2027 privacy-coin mandate. <b>Banned</b>: crypto trading, or privacy coins specifically, are prohibited.</p>
        <p>The categories come from each country’s note in the dataset (shown in the table). Population figures are rounded to the nearest million; territories under a million show as “&lt;1M”.</p>
      </More>

      <Tiles items={[
        { href: '/world-usage', title: 'When the world uses Zcash', desc: 'Activity by UTC hour, against who is awake.' },
        { href: '/swaps', title: 'Swaps', desc: 'Buying ZEC without an exchange, on NEAR Intents.' },
        { href: '/chart/exch-vol', title: 'Exchange volume', desc: 'How much ZEC trades on exchanges each day.' },
        { href: '/wallet-apps', title: 'Wallet apps', desc: 'Which apps route ZEC swaps.' },
      ]} />
    </>
  );
}
