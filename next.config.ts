import type { NextConfig } from 'next';

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'registry.testnet.initia.xyz',
      },
      {
        protocol: 'https',
        hostname: 'registry.initia.xyz',
      },
    ],
  },
};

export default nextConfig;
