import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The repo root also has a package-lock.json (the fal/VEED CLI starter),
  // so pin Turbopack's root to this app to keep it from walking up.
  turbopack: { root: __dirname },
  // The 127.0.0.1:3101 preview runs `next start` alongside `next dev`; they
  // cannot share one build directory, so that server sets NEXT_DIST_DIR.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
