import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:8080';
const monorepoRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${apiProxyTarget}/api/:path*` },
      { source: '/healthz', destination: `${apiProxyTarget}/healthz` },
      { source: '/readyz', destination: `${apiProxyTarget}/readyz` },
    ];
  },
};

export default nextConfig;
