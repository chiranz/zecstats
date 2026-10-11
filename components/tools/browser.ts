// Small browser helpers shared by the interactive Tools pages (call from effects and handlers only).

/** Keep page state in the link without adding history entries. */
export function replaceQuery(q: URLSearchParams) {
  const qs = q.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
}

/** Download rows as a CSV file (every cell quoted). */
export function downloadCsv(rows: (string | number)[][], filename: string) {
  const body = rows.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
