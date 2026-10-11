import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Separate output dirs let several dev servers run side by side (each `next dev` locks its distDir).
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // The mock data under data/api is read with fs at build/request time; keep it out of client bundles.
  outputFileTracingIncludes: { '/**': ['./data/api/**/*'] },
};

export default nextConfig;
