/** A segmented control whose other options are visible but switched off — the snapshot holds only `active`. */
export function FixedSeg({ labelledBy, options, active, why = 'Not in this snapshot' }: { labelledBy: string; options: string[]; active: string; why?: string }) {
  return (
    <div className="seg" role="group" aria-labelledby={labelledBy}>
      {options.map((k) => <button key={k} type="button" aria-pressed={k === active} disabled={k !== active} title={k === active ? undefined : why}>{k}</button>)}
    </div>
  );
}
