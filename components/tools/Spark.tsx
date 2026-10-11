// Table/feed sparkline: neutral line, a dashed baseline at the window's first value and a neutral end dot (the arrow
// and number beside it carry the direction). A thin wrapper over the shared Sparkline.
import { Sparkline } from '@/components/charts/Sparkline';

export function Spark({ values, width = 88, height = 26, label, base = true, window }: { values: number[]; width?: number; height?: number; label?: string; base?: boolean; window?: string }) {
  return <Sparkline values={values} width={width} height={height} label={label} base={base} window={window} strokeWidth={1.3} empty={<span aria-hidden="true" style={{ display: 'block', width, height }} />} />;
}
