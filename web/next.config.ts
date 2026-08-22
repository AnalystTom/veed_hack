import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The repo root also has a package-lock.json (the fal/VEED CLI starter),
  // so pin Turbopack's root to this app to keep it from walking up.
  turbopack: { root: __dirname },
};

export default nextConfig;
