// Fluid sparkline (stretches to its box; stroke width stays constant). A thin wrapper over the shared Sparkline.
import { Sparkline } from '@/components/charts/Sparkline';

export function Spark({ values, color = 'var(--text-2)', area = false, className, label, h = 32, window }: { values: (number | null)[]; color?: string; area?: boolean; className?: string; label?: string; h?: number; window?: string }) {
  return <Sparkline fluid values={values} color={color} area={area} className={className} label={label} height={h} window={window} strokeWidth={2} />;
}
