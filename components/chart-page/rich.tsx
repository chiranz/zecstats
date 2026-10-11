import type { ReactNode } from 'react';

/** Tiny inline markup for registry copy: **bold** only. Copy stays plain strings in the (serialisable) registry. */
export function rich(text: string, boldClass?: string): ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return text;
  return parts.map((p, i) => (i % 2 ? <b key={i} className={boldClass}>{p}</b> : p));
}

/** The headline sentence: honour **bold**; otherwise bold the first occurrence of the headline value. */
export function headlineSentence(sentence: string, value: string, boldClass?: string): ReactNode {
  if (sentence.includes('**')) return rich(sentence, boldClass);
  const i = value ? sentence.indexOf(value) : -1;
  if (i < 0) return sentence;
  return <>{sentence.slice(0, i)}<b className={boldClass}>{value}</b>{sentence.slice(i + value.length)}</>;
}
