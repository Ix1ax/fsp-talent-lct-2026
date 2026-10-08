import path from 'node:path';

import { defineConfig } from 'vitest/config';

// Keep JSX automatic in both Vite 7 (pnpm) and Vite 8 (npm) installations.
const config = {
  esbuild: {
    include: /\.[jt]sx?$/,
    jsx: 'automatic' as const,
  },
  oxc: {
    jsx: { runtime: 'automatic' as const },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
};

export default defineConfig(config);
