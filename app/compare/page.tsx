import type { Metadata } from 'next';
import Link from 'next/link';
import { Masthead } from '@/components/chrome/Masthead';
import { Card, ChartActions, More, Tiles } from '@/components/ui/blocks';
import { TimeSeriesChart, type ChartEvent, type Series } from '@/components/charts/TimeSeriesChart';
import { compareHref, customWindow, isRangeKey, presetFrom, windowIndex, type CompareState, type RangeKey } from '@/components/charts/range';
import type { ValueFormat } from '@/components/charts/valueFormat';
import { ComparePicker, type PickItem } from '@/components/tools/ComparePicker';
import { CHARTS, chartBySlug } from '@/lib/charts';
import { CHART_GROUPS, GROUP_SLUGS, type TimeSeriesPanel } from '@/lib/charts/types';
import { getChartCatalogue, getMetricSeries } from '@/lib/data/tools';
import { dateLong } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';
import { SectionLd } from '@/components/seo/SectionLd';

export const metadata: Metadata = pageMetadata('/compare');

const PRESETS = [
  { label: 'Price vs shielded supply', charts: ['price', 'pools'] },
  { label: 'Price vs transactions per day', charts: ['price', 'tx'] },
  { label: 'Ironwood flows vs pool balances', charts: ['flow-ironwood', 'pools'] },
  { label: 'Hashrate vs price', charts: ['hashrate', 'price'] },
];
const SERIES_COLORS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)'];
const UNIT_FORMAT: Record<string, ValueFormat> = { usd: 'usd', zec: 'zecCompact', pct: 'pct', count: 'count', mult: 'x', ratio: 'ratio', kb: 'bytes', big: 'countCompact' };

/** Registry sentences mark the key number with **bold**. */
const md = (s?: string) => (s ? s.split(/\*\*(.+?)\*\*/g).map((x, i) => (i % 2 ? <b key={i}>{x}</b> : x)) : undefined);

type Plot = { slug: string; title: string; question?: string; sentence?: string; api?: string; panels: TimeSeriesPanel[]; events?: ChartEvent[]; note?: string } | { slug: string; title: string; missing: string };

/** The registry's time-series panels when a chart is registered; otherwise the matching /api/metric-series lines. */
async function loadPlot(slug: string, titles: Map<string, string>): Promise<Plot> {
  const title = titles.get(slug) ?? slug;
  const def = chartBySlug(slug);
  if (def) {
    try {
      const data = await def.load();
      const panels = data.panels.filter((p): p is TimeSeriesPanel => p.kind === 'timeseries');
      if (panels.length) return { slug, title: def.title, question: def.question, sentence: data.headline.sentence, api: def.api[0], panels, events: data.events, note: panels.length < data.panels.length ? 'Panels that are not on a date axis are left out here.' : undefined };
      return { slug, title: def.title, missing: 'This chart is not drawn on a date axis (for example, it is plotted against coins issued), so it cannot share a time range.' };
    } catch {
      /* fall through to the metric-series fallback */
    }
  }
  const ms = await getMetricSeries();
  const lines = ms.metrics.filter((m) => m.chart === slug && !m.name.includes('(+'));
  if (!lines.length) return { slug, title, missing: 'This chart is not available for comparison yet.' };
  // one panel per unit so no panel mixes ZEC with dollars (no dual axes)
  const units = [...new Set(lines.map((l) => l.unit))];
  return {
    slug, title, api: 'metric-series',
    panels: units.map((u) => ({
      kind: 'timeseries', dates: ms.dates, format: UNIT_FORMAT[u] ?? 'countCompact', logToggle: u === 'usd',
      series: lines.filter((l) => l.unit === u).map((l, i) => ({ key: l.name, label: l.name, color: SERIES_COLORS[i % 6], values: l.series })),
    })),
    note: 'Drawn from the daily metric series while this chart’s full definition is not registered.',
  };
}

/** Cut every panel to the same [from, to] so all x-axes line up exactly. */
function slice(p: TimeSeriesPanel, from: string, to: string): TimeSeriesPanel {
  const [a, b] = windowIndex(p.dates, { from, to });
  return { ...p, dates: p.dates.slice(a, b), series: p.series.map((s): Series => ({ ...s, values: s.values.slice(a, b) })) };
}

export default async function ComparePage({ searchParams }: PageProps<'/compare'>) {
  const sp = await searchParams;
  const raw = typeof sp.charts === 'string' ? sp.charts : 'price,pools';
  const rp = typeof sp.range === 'string' ? sp.range.toUpperCase() : '';
  const range: RangeKey = isRangeKey(rp) ? rp : '1Y';
  const ann = sp.ann === '1';
  const allSlugs = Object.values(GROUP_SLUGS).flat();
  const charts = [...new Set(raw.split(',').map((x) => x.trim()).filter((x) => allSlugs.includes(x)))].slice(0, 6);

  const catalogue = await getChartCatalogue();
  const titles = new Map<string, string>(catalogue.map((c) => [c.id, c.t.replace(/^Zcash\s+/, '')]));
  for (const c of CHARTS) titles.set(c.slug, c.short);
  const groupOf = new Map<string, string>(Object.entries(GROUP_SLUGS).flatMap(([g, slugs]) => slugs.map((s) => [s, CHART_GROUPS.find((x) => x.id === g)!.title] as [string, string])));
  const items: PickItem[] = allSlugs.map((slug) => ({ slug, title: titles.get(slug) ?? slug, group: groupOf.get(slug) ?? '' }));

  const plots = await Promise.all(charts.map((c) => loadPlot(c, titles)));
  const ok = plots.filter((p): p is Extract<Plot, { panels: TimeSeriesPanel[] }> => 'panels' in p);
  // shared window: ends on the earliest last date among the charts, so no chart runs past another
  const end = ok.length ? ok.map((p) => p.panels.map((x) => x.dates.at(-1)!).sort()[0]).sort()[0] : '';
  const firstAll = ok.length ? ok.map((p) => p.panels.map((x) => x.dates[0]).sort()[0]).sort()[0] : '';
  // ?from=&to= (the live site's custom window, clamped to the data) wins over ?range=
  const win = customWindow(sp.from, sp.to, firstAll, end);
  const from = win ? win.from : end ? presetFrom(range, firstAll, end) : '';
  const to = win ? win.to : end;
  const state: CompareState = { range, win, ann };
  const windowWords = win ? 'custom window' : range === 'ALL' ? 'full history' : range === 'YTD' ? 'year-to-date window' : `${range} window`;
  const hasEvents = ok.some((p) => p.events?.length);

  return (
    <>
      <SectionLd path="/compare" />
      <Masthead
        title="Compare charts on one time range"
        lede={charts.length ? <>{charts.length} chart{charts.length === 1 ? '' : 's'} stacked on the same {windowWords}{to ? <>, {dateLong(from)} to {dateLong(to)}</> : null}. Add, reorder or remove charts; the set and the range are kept in the link.</> : 'Search for any of the 58 charts and stack them on one shared time range, one above the other. The set and the range are kept in the link.'}
      />
      <ComparePicker items={items} charts={charts} state={state} bounds={end ? { from: firstAll, to: end } : null} hasEvents={hasEvents} />
      {charts.length === 0 && (
        <div className="card">
          <h2 className="h3">Start from a pairing</h2>
          <div className="tiles">
            {PRESETS.map((p) => (
              <Link key={p.label} className="tile" href={compareHref(p.charts, state)}>
                <span className="n">{p.label}</span>
                <span className="d">{p.charts.map((c) => titles.get(c) ?? c).join(' · ')}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {plots.map((p) => {
        if (!('panels' in p)) {
          return <Card key={p.slug} title={<Link href={`/chart/${p.slug}`}>{p.title}</Link>} takeaway={p.missing} />;
        }
        const cut = p.panels.map((panel) => slice(panel, from, to));
        const csv = { file: `zecstats-compare-${p.slug}-${from}_${to}.csv`, panels: cut.map((x) => ({ title: x.title, dates: x.dates, series: x.series.map((s) => ({ label: s.label, values: s.values })) })) };
        return (
          <Card key={p.slug} title={<Link href={`/chart/${p.slug}`} style={{ color: 'var(--value)' }}>{p.question ?? p.title}</Link>} takeaway={md(p.sentence)} actions={<ChartActions api={p.api} name={p.title} csv={csv} />}
            foot={<>{p.title} · {dateLong(from)} – {dateLong(to)}{p.note ? ` · ${p.note}` : ''} · <Link href={`/chart/${p.slug}`}>Open the full chart →</Link></>}>
            {p.panels.map((panel, i) => {
              const sp2 = cut[i];
              return (
                <div key={i} className="stack" style={{ gap: 6 }}>
                  {panel.title && <p className="small mono">{panel.title}</p>}
                  {sp2.dates.length > 1
                    ? <TimeSeriesChart dates={sp2.dates} series={sp2.series} format={panel.format} stacked={panel.stacked} shareToggle={panel.shareToggle} yDomain={panel.yDomain} zeroBaseline={panel.zeroBaseline} logToggle={panel.logToggle} defaultLog={panel.defaultLog} step={panel.step} ranges={false} events={ann && i === 0 ? p.events : undefined} height={Math.min(panel.height ?? 280, 280)} ariaLabel={`${p.title}${panel.title ? ` — ${panel.title}` : ''}, ${dateLong(from)} to ${dateLong(to)}`} />
                    : <p className="note">No data in this window.</p>}
                </div>
              );
            })}
          </Card>
        );
      })}
      <More summary="How the shared range works">
        <p><b>One window for every chart.</b> The range ends on the latest date that every chart on the page has reached, so no chart runs past another, and starts the chosen number of days before it (YTD starts on 1 January). Custom picks both ends; dates outside the data move to the nearest end. All x-axes therefore cover exactly the same days, and the link keeps the window as <span className="mono">?from=&amp;to=</span>.</p>
        <p><b>Units are never mixed on one axis.</b> Charts sit one above the other instead of sharing a second y-axis, which would let the scale choice invent a relationship. For how strongly two metrics move together, use Correlations.</p>
        <p>Up to six charts at once. Charts plotted against something other than the date (coins issued, for example) are listed but not drawn.</p>
      </More>
      <Tiles
        items={[
          { href: '/correlate', title: 'Correlations', desc: 'How strongly any two of these metrics move together, as a number.', value: 'r from −1 to +1' },
          { href: '/charts', title: 'All 58 charts', desc: 'The full index, grouped by the question each chart answers.', value: '7 groups' },
          { href: '/metrics', title: 'Metrics table', desc: 'Every headline number with its 28-day and 12-month change.', value: '43 metrics' },
          { href: '/btc-bull-run', title: 'ZEC 2026 vs BTC 2017', desc: 'Two price runs aligned by day instead of by date.', value: 'Day by day' },
        ]}
      />
    </>
  );
}
