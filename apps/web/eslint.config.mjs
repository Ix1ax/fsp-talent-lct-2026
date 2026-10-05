import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlatCompat } from '@eslint/eslintrc';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'next-env.d.ts'],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000(?!.*\\.(css|scss|sass|less)$)'],
            ['^node:'],
            ['^react', '^next', '^@?\\w'],
            [
              '^@/shared',
              '^@/entities',
              '^@/features',
              '^@/widgets',
              '^@/pages',
            ],
            ['^@/'],
            ['^\\.'],
            [
              '^\\u0000.*\\.(css|scss|sass|less)$',
              '^.+\\.(css|scss|sass|less)$',
            ],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
    },
  },
];

export default eslintConfig;
