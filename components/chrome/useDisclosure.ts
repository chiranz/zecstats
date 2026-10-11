'use client';

import { useEffect, useId, useRef, useState } from 'react';

/** Button + panel: Escape and an outside click close it; Escape returns focus to the button. */
export function useDisclosure() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); } };
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);
  const wrap = {
    ref: wrapRef,
    onBlur: (e: React.FocusEvent) => { if (open && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); },
  };
  const button = { ref: btnRef, type: 'button' as const, 'aria-expanded': open, 'aria-controls': id, onClick: () => setOpen((o) => !o) };
  return { open, setOpen, id, wrap, button };
}
