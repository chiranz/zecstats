import Link from 'next/link';
import { Masthead } from '@/components/chrome/Masthead';
import { More, Section } from '@/components/ui/blocks';
import { Icon } from '@/components/ui/Icon';
import { CustomPanelView } from '@/components/charts/custom';
import { CHART_GROUPS, GROUP_SLUGS, type ChartData, type ChartDef, type ChartGroupId, type CustomPanel, type TimeSeriesPanel } from '@/lib/charts/types';
import { chartBySlug } from '@/lib/charts';
import { liveTitle, getLiveCharts } from '@/lib/data/charts-a';
import { dateLong, monthYear } from '@/lib/format';
import { ChartBody } from './ChartBody';
import { headlineSentence, rich } from './rich';
import s from './chart-page.module.css';

const SOURCE_KIND: Record<ChartDef['source'], string> = {
  onchain: 'On-chain, exact — computed from our Zebra node',
  price: 'Price-derived — on-chain figures × an external price',
  external: 'External — reported by a third party, not verifiable on-chain',
};

const CADENCE: Record<ChartDef['source'], string> = { onchain: 'exact, from consensus', price: 'daily close × on-chain', external: 'external input · daily' };

export function groupOf(slug: string): ChartGroupId | undefined {
  return (Object.keys(GROUP_SLUGS) as ChartGroupId[]).find((g) => GROUP_SLUGS[g].includes(slug));
}

/** Safe load: a broken loader must not take the whole page (or the index) down. */
export async function safeLoad(def: ChartDef): Promise<ChartData | null> {
  try { return await def.load(); } catch (e) { console.error(`[chart] ${def.slug} load failed`, e); return null; }
}

async function titleFor(slug: string) {
  const d = chartBySlug(slug);
  return d ? d.short : await liveTitle(slug);
}

export async function ChartPage({ slug }: { slug: string }) {
  const def = chartBySlug(slug);
  const gid = groupOf(slug)!;
  const group = CHART_GROUPS.find((g) => g.id === gid)!;
  const crumbs = [{ href: '/charts', label: 'Charts' }, { href: `/charts#g-${gid}`, label: group.title }];

  if (!def) return <NotBuilt slug={slug} crumbs={crumbs} groupTitle={group.title} />;
  const data = await safeLoad(def);
  if (!data) return <NotBuilt slug={slug} crumbs={crumbs} groupTitle={group.title} title={def.title} failed />;

  const { headline } = data;
  const sectionPanels = data.panels.map((p, i) => ({ p, i })).filter(({ p, i }) => p.kind === 'custom' && i > 0 && p.title) as { p: CustomPanel; i: number }[];
  const ts = data.panels.find((p): p is TimeSeriesPanel => p.kind === 'timeseries');
  const history = ts?.dates.length ? `Since ${monthYear(ts.dates[0]).replace("'", '’')} · ${ts.dates.length.toLocaleString('en-US')} data points` : null;

  // Prev / next inside the group, and the related tiles.
  const list = GROUP_SLUGS[gid];
  const pos = list.indexOf(slug);
  const prev = list[(pos - 1 + list.length) % list.length];
  const next = list[(pos + 1) % list.length];
  const [prevT, nextT] = await Promise.all([titleFor(prev), titleFor(next)]);
  const related = await Promise.all(
    def.related.slice(0, 4).map(async (r) => {
      const d = chartBySlug(r);
      if (!d) return { slug: r, title: await liveTitle(r), desc: (await getLiveCharts()).get(r)?.d ?? '', value: '' };
      const rd = await safeLoad(d);
      return { slug: r, title: d.short, desc: d.question, value: rd?.indexValue ?? rd?.headline.value ?? '' };
    }),
  );
  const siblings = await Promise.all(list.filter((x) => x !== slug).map(async (x) => ({ slug: x, title: await titleFor(x) })));
  const [intro, ...rest] = def.explainer;

  return (
    <div className={s.page}>
      <Masthead crumbs={crumbs} title={def.title} lede={headlineSentence(headline.sentence, headline.value, s.mastB)} cadence={CADENCE[def.source]} />

      <ChartBody
        slug={def.slug}
        title={def.title}
        question={def.question}
        panels={data.panels}
        ranges={data.ranges}
        defaultRange={data.defaultRange}
        events={data.events}
        dataThrough={data.dataThrough}
        sourceNote={def.sourceNote}
        api={def.api[0]}
        notes={data.notes}
      />

      {sectionPanels.map(({ p, i }) => (
        <Section key={i} id={`panel-${i}`} title={p.title}>
          <CustomPanelView component={p.component} props={p.props} />
        </Section>
      ))}

      <section className={s.split} aria-label="About this chart">
        <div className="sec">
          {intro && (
            <>
              <div className="sec-h"><h2 className="h2">{intro.heading}</h2></div>
              <div className={s.prose}>{intro.paragraphs.map((p, i) => <p key={i}>{rich(p)}</p>)}</div>
            </>
          )}
        </div>
        <div className={s.facts}>
          <div className="card" style={{ gap: 12 }}>
            <h2 className="h3">About this chart</h2>
            <dl>
              <dt>Unit</dt><dd>{def.unit}</dd>
              <dt>Source</dt><dd>{def.sourceNote}</dd>
              <dt>Data</dt><dd>{SOURCE_KIND[def.source]}</dd>
              {history && <><dt>History</dt><dd>{history}</dd></>}
              <dt>Data through</dt><dd>{dateLong(data.dataThrough)}</dd>
              {def.pools && def.pools.length > 0 && <><dt>Pools</dt><dd>{def.pools.map((p) => p[0].toUpperCase() + p.slice(1)).join(', ')}</dd></>}
              {data.events && data.events.length > 0 && <><dt>Events</dt><dd>{data.events.map((e) => `${e.label} (${dateLong(e.date)})`).join(' · ')}</dd></>}
              <dt>API</dt><dd>{def.api.map((a, i) => <span key={a}>{i > 0 && ' · '}<a href={`/api/${a}`}>/api/{a}</a></span>)}</dd>
            </dl>
          </div>
          {rest.length > 0 && (
            <More summary="Methodology & caveats">
              <div className={s.moreBody}>
                {rest.map((sec, i) => (
                  <div key={i} className="stack" style={{ gap: 8 }}>
                    <h3>{sec.heading}</h3>
                    {sec.paragraphs.map((p, j) => <p key={j}>{rich(p)}</p>)}
                  </div>
                ))}
              </div>
            </More>
          )}
        </div>
      </section>

      <section className="sec" aria-labelledby="next-h">
        <nav className={s.trail} aria-label="Chart sequence">
          <Link className={s.pill} href={`/chart/${prev}`}><span aria-hidden="true">←</span>{prevT}</Link>
          <span className={s.pos}>{pos + 1} of {list.length} in {group.title}</span>
          <Link className={s.pill} href={`/chart/${next}`}>{nextT}<span aria-hidden="true">→</span></Link>
        </nav>
        {related.length > 0 && (
          <>
            <div className="sec-h"><h2 className="h2" id="next-h">Read next</h2></div>
            <div className={s.tiles}>
              {related.map((t) => (
                <Link key={t.slug} className={s.tile} href={`/chart/${t.slug}`}>
                  <span className={s.tt}>{t.title}<Icon name="arrow-right" size={14} /></span>
                  <span className={s.tw}>{t.desc}</span>
                  {t.value && <span className={s.tv}>{t.value}</span>}
                </Link>
              ))}
            </div>
          </>
        )}
        <div className={s.moreIn}>
          <h3 className="kicker">More in {group.title}</h3>
          <div className={s.chips}>
            {siblings.map((x) => <Link key={x.slug} className="chip" href={`/chart/${x.slug}`}>{x.title}</Link>)}
            <Link className="chip" href="/charts">All 58 charts →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

async function NotBuilt({ slug, crumbs, groupTitle, title, failed = false }: { slug: string; crumbs: { href?: string; label: string }[]; groupTitle: string; title?: string; failed?: boolean }) {
  const live = (await getLiveCharts()).get(slug);
  return (
    <div className={s.page}>
      <Masthead crumbs={crumbs} title={title ?? (await liveTitle(slug))} lede={live?.d} />
      <div className={s.empty} role="status">
        <span className="kicker">{failed ? 'Data unavailable' : 'Coming soon'}</span>
        <p>
          {failed
            ? 'This chart’s data could not be loaded, so nothing is drawn rather than a wrong line.'
            : `This chart is part of the ${groupTitle} group. Its page is coming soon.`}
        </p>
        <div className="row">
          <Link className="btn" href="/charts">All 58 charts</Link>
        </div>
      </div>
    </div>
  );
}
