import type { Metadata } from 'next';
import { Masthead } from '@/components/chrome/Masthead';
import { Callout, Card, Kpi, KpiBand, More, Section, Tiles } from '@/components/ui/blocks';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import t from '@/components/tools/tools.module.css';
import { getSignalsReplay, SIGNAL_CALLS } from '@/lib/data/tools';
import { dateLong, num, usd } from '@/lib/format';

export const metadata: Metadata = { title: 'Signals (beta) — when the model changed its mind', description: 'Every call the experimental allocation model has made, word for word, and what acting on each one would have done.' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const when = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${String(d.getUTCHours()).padStart(2, '0')}:00`; };
const signed = (v: number | null, suffix = '%') => (v == null ? '—' : `${v > 0 ? '▲' : v < 0 ? '▼' : ''} ${num(Math.abs(v), 1)}${suffix}`);
const dir = (v: number | null) => (v == null || v === 0 ? undefined : v > 0 ? 'up' : 'dn');

export default async function SignalsPage() {
  const r = await getSignalsReplay();
  const follow = (r.followEnd / r.startUsd - 1) * 100, hold = (r.holdEnd / r.startUsd - 1) * 100, avg = (r.avgShareEnd / r.startUsd - 1) * 100;
  const changes = SIGNAL_CALLS.filter((c) => c.effect != null);
  const helped = changes.filter((c) => (c.effect ?? 0) > 0).length, hurt = changes.filter((c) => (c.effect ?? 0) < 0).length;
  const live = SIGNAL_CALLS.filter((c) => c.mode === 'live');
  const firstLive = live.at(-1)!.at.slice(0, 10);
  const gap = follow - hold;
  return (
    <>
      <Masthead
        kicker="Experimental"
        crumbs={[{ href: '/tools', label: 'About' }, { label: 'Signals' }]}
        title={<>When has the model changed its mind?<span className={t.beta}>BETA</span></>}
        lede={<>An allocation model run on our node&apos;s data sends a message when it changes its mind. Following its {SIGNAL_CALLS.length} calls since {dateLong(r.start)} turned $10,000 into {usd(r.followEnd, 0)} (<span className={dir(follow)}>{signed(follow)}</span>) — {gap < 0 ? 'less than' : 'more than'} simply holding ZEC, which made {usd(r.holdEnd, 0)} (<span className={dir(hold)}>{signed(hold)}</span>).</>}
      />
      <Callout title="Research, not advice. The channel is not open yet." tone="warn">
        The messages go to a private, paid Telegram channel that is still being tested; this page is the free part — every message, word for word. {SIGNAL_CALLS.length - live.length} of the {SIGNAL_CALLS.length} calls are replayed history, not live calls. Read the caveats at the bottom before trusting any of it.
      </Callout>

      <KpiBand label="How following the calls would have done">
        <Kpi k="Following the calls" v={<span className={dir(follow)}>{signed(follow)}</span>} s={`${usd(r.followEnd, 0)} now · worst fall ${num(r.followDd, 1)}%`} />
        <Kpi k="Holding ZEC throughout" v={<span className={dir(hold)}>{signed(hold)}</span>} s={`${usd(r.holdEnd, 0)} now · worst fall ${num(r.holdDd, 1)}%`} />
        <Kpi k="Calls vs holding" v={<span className={dir(gap)}>{signed(gap, ' pts')}</span>} s={`Holding its average ${num(r.avgShare, 0)}% share instead: ${signed(avg)}`} />
        <Kpi k="Calls that helped" v={`${helped} of ${changes.length}`} s={`${hurt} hurt · ${usd(r.fees, 0)} in trading fees`} />
      </KpiBand>

      <Card
        title="What would $10,000 have become, following the calls or holding?"
        takeaway={<>Following the calls ends at <b>{usd(r.followEnd, 0)}</b>, holding at <b>{usd(r.holdEnd, 0)}</b>. The calls cut the worst fall from {num(r.holdDd, 0)}% to {num(r.followDd, 0)}% but gave up {num(Math.abs(gap), 0)} points of return.</>}
        foot={`$10,000 on ${dateLong(r.start)}, moved to each call's share of ZEC at the price it quoted, rest in cash · 0.1% fee on each trade · marked at daily closes through ${dateLong(r.end)} · dashed line: live calls from ${dateLong(firstLive)}`}
      >
        <TimeSeriesChart dates={r.dates} ranges={false} format="usd0" height={280} events={[{ date: firstLive, label: 'live from here' }]}
          series={[{ key: 'f', label: 'Following the calls', color: 'var(--zec)', values: r.follow }, { key: 'h', label: 'Holding ZEC', color: 'var(--text-2)', dashed: true, values: r.hold }]}
          ariaLabel={`Value of $10,000 following the calls versus holding ZEC, ${dateLong(r.start)} to ${dateLong(r.end)}`} />
        <p className="small mono">Share of the account in ZEC</p>
        <TimeSeriesChart dates={r.dates} ranges={false} format="pct0" height={150} step yDomain={[0, 100]} events={[{ date: firstLive, label: 'live' }]}
          series={[{ key: 's', label: 'Share of ZEC held', color: 'var(--s2)', type: 'area', values: r.share }]} showLegend={false}
          ariaLabel="Share of the account held in ZEC after each call, 0 to 100%" />
      </Card>

      <Section id="calls" title="Every call, and what it did">
        <p className="note">Newest first. <b>Effect</b> is the dollars the change made or cost until the next call, after fees, against not changing anything. Open a call for the exact words the channel sent (or, for replayed calls, would have sent).</p>
        <div className="tbl-wrap">
          <table className="t">
            <caption className="sr-only">Every signal call with its share change, price and effect</caption>
            <thead><tr><th scope="col">When (UTC)</th><th scope="col" style={{ textAlign: 'left' }}>Call</th><th scope="col">Share of ZEC</th><th scope="col">ZEC then</th><th scope="col">Next 7 days</th><th scope="col">Next 30 days</th><th scope="col">Effect</th></tr></thead>
            <tbody>
              {SIGNAL_CALLS.map((c) => (
                <tr key={c.at} style={{ verticalAlign: 'top' }}>
                  <td>{when(c.at)}<span className="small" style={{ display: 'block' }}><span className="badge">{c.mode === 'live' ? 'Live' : 'Replayed'}</span> block {num(c.block)}</span></td>
                  <td style={{ textAlign: 'left', whiteSpace: 'normal', minWidth: 220 }}>
                    <details>
                      <summary style={{ cursor: 'pointer' }}><b className="value">{c.stance}</b> · {c.call}</summary>
                      <pre className="mono" style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: 'var(--text-2)', background: 'var(--inset)', border: '1px solid var(--line)', borderRadius: 8, padding: 10, margin: '8px 0 0', maxWidth: 420 }}>{c.message}</pre>
                    </details>
                  </td>
                  <td>{c.from == null ? `${c.to}% (start)` : `${c.from}% → ${c.to}%`}</td>
                  <td>{usd(c.price, 2)}</td>
                  <td><span className={dir(c.next7)}>{signed(c.next7)}</span></td>
                  <td>{c.next30 == null ? <span className="muted" title="Fewer than 30 days have passed">not yet</span> : <span className={dir(c.next30)}>{signed(c.next30)}</span>}</td>
                  <td><span className={dir(c.effect)}>{c.effect == null ? '—' : `${c.effect > 0 ? '+' : '−'}${usd(Math.abs(c.effect), 0)}`}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <More summary="Read this before trusting any of it">
        <p><b>{SIGNAL_CALLS.length - live.length} of the {SIGNAL_CALLS.length} calls are replayed, not live.</b> For each day before the channel existed the model was run on the data through that day and no further, and the same rules decided whether it would have spoken. It could not see the future, but its design was settled in September 2026 with this history in view, so the replay flatters it. The {live.length} calls from {dateLong(firstLive)} on were decided live, hour by hour, and written down before anyone knew how they would turn out — those are the record proper.</p>
        <p><b>Under three months is a short record.</b> A handful of calls cannot tell skill from luck, and one big move decides most of the result.</p>
        <p><b>Fills are idealised.</b> Replayed calls trade at the day&apos;s closing price, live ones at the price in the message. Real fills would differ, cash earns nothing here, and taxes are ignored.</p>
        <p><b>Thresholds re-fit daily,</b> so the suggested share can move a long way on a small change in the score. That shows up as trades, and the fees are counted.</p>
        <p><b>How this page computes the record.</b> The replay above is recomputed here from the call log and daily closes; the live page reports $18,155 following and $21,601 holding through 11 Oct. The call log itself is transcribed from the live page, which has no data API for it.</p>
      </More>
      <Tiles
        items={[
          { href: '/pro', title: 'ZEC Stats Pro', desc: 'The paid channel and the password-protected research page.', value: 'Not open yet' },
          { href: '/chart/price', title: 'ZEC price', desc: 'The price every call was judged against.', value: usd(r.endPrice, 2) },
          { href: '/metrics', title: 'Metrics table', desc: 'The on-chain numbers the model reads, with their recent change.', value: '43 metrics' },
          { href: '/btc-bull-run', title: 'ZEC 2026 vs BTC 2017', desc: 'Another way people read the 2026 run — with the same caveats.', value: 'Day by day' },
        ]}
      />
    </>
  );
}
