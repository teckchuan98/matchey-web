import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',

  async rewrites() {
    return [
      { source: '/invite', destination: '/invite/index.html' },
      { source: '/invite/', destination: '/invite/index.html' },
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
