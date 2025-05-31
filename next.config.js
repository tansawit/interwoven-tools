/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'registry.testnet.initia.xyz',
      },
    ],
  },
}

module.exports = nextConfig
