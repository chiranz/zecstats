'use client';

import type { CustomComponent } from './index';

// Owned by agent B1. Key = CustomPanel.component name; keep names prefixed per group to avoid clashes.
export const customA: Record<string, CustomComponent> = {};
