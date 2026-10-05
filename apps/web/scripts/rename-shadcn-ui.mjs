#!/usr/bin/env node
/**
 * Renames kebab-case shadcn files in src/shared/ui to PascalCase
 * and rewrites local @/shared/ui/* imports.
 *
 * Usage after `pnpm dlx shadcn@latest add …`:
 *   node scripts/rename-shadcn-ui.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uiDir = path.resolve(__dirname, '../src/shared/ui');

function toPascalCase(name) {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

const files = fs.readdirSync(uiDir).filter((f) => f.endsWith('.tsx'));
const renameMap = new Map();

for (const file of files) {
  const base = file.replace(/\.tsx$/, '');
  renameMap.set(base, toPascalCase(base));
}

for (const [from, to] of renameMap) {
  if (from === to) continue;
  const fromPath = path.join(uiDir, `${from}.tsx`);
  const toPath = path.join(uiDir, `${to}.tsx`);
  if (fs.existsSync(fromPath)) {
    fs.renameSync(fromPath, toPath);
    console.log(`rename ${from}.tsx -> ${to}.tsx`);
  }
}

const updatedFiles = fs.readdirSync(uiDir).filter((f) => f.endsWith('.tsx'));
for (const file of updatedFiles) {
  const filePath = path.join(uiDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let next = content;

  for (const [from, to] of renameMap) {
    next = next.replaceAll(`@/shared/ui/${from}`, `@/shared/ui/${to}`);
  }

  next = next.replaceAll('@/components/ui/', '@/shared/ui/');
  next = next.replaceAll('@/lib/utils', '@/shared/lib/utils');
  next = next.replaceAll('from "cn"', 'from "@/shared/lib/utils"');
  next = next.replaceAll("from 'cn'", "from '@/shared/lib/utils'");

  if (next !== content) {
    fs.writeFileSync(filePath, next);
    console.log(`updated ${file}`);
  }
}

const barrel = [...new Set(renameMap.values())]
  .sort()
  .map((name) => `export * from './${name}';`)
  .join('\n');

fs.writeFileSync(path.join(uiDir, 'index.ts'), `${barrel}\n`);
console.log('updated index.ts');
