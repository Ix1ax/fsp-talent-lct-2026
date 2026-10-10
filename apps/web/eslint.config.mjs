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
    ignores: [
      '.next*/**',
      'dist/**',
      'node_modules/**',
      'out/**',
      'next-env.d.ts',
    ],
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
              '^@/screens',
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
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CatchClause > BlockStatement[body.length=0]',
          message:
            'Пустой catch запрещён, в том числе с комментариями. Нужна явная обработка ошибки.',
        },
        {
          selector:
            'CallExpression[callee.type="MemberExpression"][callee.property.name="catch"] > :matches(ArrowFunctionExpression, FunctionExpression) > BlockStatement[body.length=0]',
          message:
            'Обработчик ошибки не должен быть пустым: обработайте ошибку, выберите fallback или передайте её выше.',
        },
      ],
    },
  },
  {
    files: [
      'src/entities/company/**/*.{ts,tsx}',
      'src/entities/employer-need/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/entities/**',
                '@/features/**',
                '@/widgets/**',
                '@/screens/**',
              ],
              message: 'Entity зависит только от shared и собственных модулей.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/entities/employer-bank/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex:
                '^@/(?:entities/(?!employer-need/@x/employer-bank$)|features/|widgets/|screens/)',
              message:
                'Entity использует shared, собственные модули и явный контракт @x.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/features/company/**/*.{ts,tsx}',
      'src/features/employer-bank/**/*.{ts,tsx}',
      'src/features/employer-need/**/*.{ts,tsx}',
      'src/features/employer-search/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/**', '@/widgets/**', '@/screens/**'],
              message:
                'Feature зависит только от entities, shared и собственных модулей.',
            },
            {
              group: [
                '@/entities/*/**',
                '!@/entities/*/client',
                '!@/entities/*/server',
              ],
              message: 'Используйте публичный API entity.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/widgets/employer-shell/**/*.{ts,tsx}',
      'src/widgets/needs-board/**/*.{ts,tsx}',
      'src/widgets/need-matches/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/widgets/**', '@/screens/**'],
              message: 'Widget не зависит от экранов и соседних widgets.',
            },
            {
              group: [
                '@/entities/*/**',
                '@/features/*/**',
                '!@/entities/*/client',
                '!@/entities/*/server',
              ],
              message: 'Используйте публичный API слайса.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/screens/employer/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/entities/*/**',
                '@/features/*/**',
                '@/widgets/*/**',
                '!@/entities/*/client',
                '!@/entities/*/server',
              ],
              message: 'Экран использует публичные API нижних слоёв.',
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
