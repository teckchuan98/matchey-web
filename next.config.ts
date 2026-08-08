import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',

  images: {
    // Allow quality=100 on <Image> for crisp hero/screenshot renders.
    qualities: [75, 90, 100],
  },

  async rewrites() {
    return [
      { source: '/invite', destination: '/invite/index.html' },
      { source: '/invite/', destination: '/invite/index.html' },
      {
        source: '/friend-invite',
        destination: '/friend-invite/index.html',
      },
      {
        source: '/friend-invite/',
        destination: '/friend-invite/index.html',
      },
      { source: '/privacy', destination: '/privacy/index.html' },
      { source: '/privacy/', destination: '/privacy/index.html' },
      { source: '/tos', destination: '/tos/index.html' },
      { source: '/tos/', destination: '/tos/index.html' },
    ];
  },

  async headers() {
    return [
      {
        source: '/.well-known/apple-app-site-association',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=300' },
        ],
      },
      {
        source: '/.well-known/assetlinks.json',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=300' },
        ],
      },
    ];
  },
};

export default nextConfig;
