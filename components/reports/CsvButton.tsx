'use client';

import { Icon } from '@/components/ui/Icon';
import { downloadCsv } from '@/components/tools/browser';
import { csvName } from './params';

/** Download the rows behind a report as CSV (header = the keys of the first row, as the live site's export does). */
export function CsvButton({ rows, slug, label = 'Download CSV', className = 'btn' }: { rows: Record<string, string | number | null>[]; slug: string; label?: string; className?: string }) {
  const save = () => {
    if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    downloadCsv([cols, ...rows.map((r) => cols.map((c) => r[c] ?? ''))], csvName(slug));
  };
  return <button type="button" className={className} onClick={save} disabled={!rows.length}><Icon name="download" size={14} />{label}</button>;
}
