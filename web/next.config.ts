import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // Script generation consumes one canonical Markdown file from the repository
  // root, so Turbopack and output tracing share that boundary.
  turbopack: { root: path.join(__dirname, '..') },
  // Server-side script generation reads the canonical repository-level
  // joke_guidelines.md. Trace it into Vercel's function bundle while keeping
  // one source of truth for local and deployed generation.
  outputFileTracingRoot: path.join(__dirname, '..'),
  outputFileTracingIncludes: {
    '/*': ['../joke_guidelines.md'],
  },
  // The 127.0.0.1:3101 preview runs `next start` alongside `next dev`; they
  // cannot share one build directory, so that server sets NEXT_DIST_DIR.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
