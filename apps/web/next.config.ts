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
  // Dev и production-сборка не должны перезаписывать файлы друг друга.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  // .local.tsx — только локальные страницы, исключённые из Git и Docker.
  pageExtensions:
    process.env.NODE_ENV === 'development'
      ? ['local.tsx', 'tsx', 'ts', 'jsx', 'js']
      : ['tsx', 'ts', 'jsx', 'js'],
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
