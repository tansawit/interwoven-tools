/** @type {import('next').NextConfig} */
const nextConfig = {
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

module.exports = nextConfig;
