import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    /** Curated JPGs live under `public/marketing/`; keep old links working. */
    return [
      { source: '/hero.jpg', destination: '/marketing/hero.jpg', permanent: true },
      { source: '/1bhk.jpg', destination: '/marketing/1bhk.jpg', permanent: true },
      { source: '/2bhk.jpg', destination: '/marketing/2bhk.jpg', permanent: true },
      { source: '/full-farm.jpg', destination: '/marketing/full-farm.jpg', permanent: true },
    ];
  },
};

export default nextConfig;
