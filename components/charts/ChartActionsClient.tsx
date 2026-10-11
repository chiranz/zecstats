'use client';

// The Link · PNG · CSV icon group behind `ChartActions` (components/ui/blocks.tsx). Link copies the page URL (whose
// query holds the view) plus the card's anchor; PNG exports the card's chart SVG; CSV is built from the panel data
// when the page passes it, otherwise the icon links the API JSON the card is drawn from.
import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { fileSlug, findChartSvg, saveBlob, saveCsv, svgToPng, timeSeriesCsv, type CsvPanel } from './exportChart';

export type ChartActionsCsv = { file: string; panels: CsvPanel[] };

export function ChartActionsClient({ api, name, csv }: { api?: string; name: string; csv?: ChartActionsCsv }) {
  const ref = useRef<HTMLDivElement>(null);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const say = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(''), 2200); };
  const card = () => ref.current?.closest('.card, section') ?? ref.current?.parentElement ?? null;

  const copy = async () => {
    const id = card()?.id;
    const u = new URL(window.location.href);
    if (id) u.hash = id;
    try {
      await navigator.clipboard.writeText(u.toString());
      setCopied(true); window.setTimeout(() => setCopied(false), 1800);
      say('Link copied');
    } catch { say('Could not copy the link'); }
  };
  const png = async () => {
    const svg = findChartSvg(card());
    if (!svg) { say('Nothing to export yet'); return; }
    try { saveBlob(await svgToPng(svg, name, `zecstats.com${window.location.pathname}`), `zecstats-${fileSlug(name)}.png`); }
    catch { say('PNG export failed'); }
  };
  const downloadCsv = () => {
    const rows = csv ? timeSeriesCsv(csv.panels) : null;
    if (!rows || !csv) { say('Nothing to export yet'); return; }
    saveCsv(rows, csv.file);
  };

  return (
    <div ref={ref} className="row" style={{ gap: 4 }} role="group" aria-label={`Share and download: ${name}`}>
      <button className="btn icon ghost" type="button" onClick={copy} aria-label={`Copy link to ${name}`} title="Copy link"><Icon name={copied ? 'check' : 'link'} size={15} /></button>
      <button className="btn icon ghost" type="button" onClick={png} aria-label={`Download ${name} as PNG`} title="Download PNG"><Icon name="image" size={15} /></button>
      {csv ? (
        <button className="btn icon ghost" type="button" onClick={downloadCsv} aria-label={`Download ${name} data as CSV`} title="Download CSV"><Icon name="download" size={15} /></button>
      ) : api ? (
        <a className="btn icon ghost" href={`/api/${api}`} aria-label={`Download ${name} data`} title="Download data"><Icon name="download" size={15} /></a>
      ) : null}
      <span className="sr-only" aria-live="polite">{msg}</span>
    </div>
  );
}
