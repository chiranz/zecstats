'use client';

// Renders a CustomPanel (lib/charts/types.ts) by name. Each registry half owns its own map:
//   ./registry-a.tsx (agent B1: price, costbasis, privacy) · ./registry-b.tsx (agent B2: usage, holders, supply, markets)
import type { ComponentType } from 'react';
import { customA } from './registry-a';
import { customB } from './registry-b';

export type CustomComponent = ComponentType<Record<string, unknown>>;
const CUSTOM: Record<string, CustomComponent> = { ...customA, ...customB };

export function CustomPanelView({ component, props }: { component: string; props: Record<string, unknown> }) {
  const C = CUSTOM[component];
  if (!C) return <p className="small">Unknown panel “{component}”.</p>;
  return <C {...props} />;
}
