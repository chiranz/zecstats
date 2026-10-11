/** A segmented control whose other options are visible but disabled — only `active` has data. */
export function FixedSeg({ labelledBy, options, active }: { labelledBy: string; options: string[]; active: string }) {
  return (
    <div className="seg" role="group" aria-labelledby={labelledBy}>
      {options.map((k) => <button key={k} type="button" aria-pressed={k === active} disabled={k !== active}>{k}</button>)}
    </div>
  );
}
