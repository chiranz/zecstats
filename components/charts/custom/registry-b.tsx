'use client';

import type { CustomComponent } from './index';

// Owned by agent B2. Key = CustomPanel.component name; keep names prefixed per group to avoid clashes.
export const customB: Record<string, CustomComponent> = {};
