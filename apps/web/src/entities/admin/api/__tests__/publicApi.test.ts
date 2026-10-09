import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { expect, it } from 'vitest';

import {
  AdminApiError,
  adminRequest,
  adminSchemas,
  getAdminCatalogs,
  startAdminPreview,
} from '@/entities/admin';

import {
  AdminApiError as TransportError,
  adminRequest as request,
} from '../adminRequest';
import { adminSchemas as schemas } from '../schemas';

it('retains the public API and error class identity after separating the transport', () => {
  expect(adminRequest).toBe(request);
  expect(AdminApiError).toBe(TransportError);
  expect(adminSchemas).toBe(schemas);
  expect(typeof getAdminCatalogs).toBe('function');
  expect(typeof startAdminPreview).toBe('function');
});
it('has no relative import cycle in the admin API entry graph', () => {
  const visit = (file: string, parents: string[]) => {
    expect(
      parents,
      `Import cycle: ${[...parents, file].join(' → ')}`,
    ).not.toContain(file);
    const code = readFileSync(file, 'utf8');
    for (const match of code.matchAll(/\bfrom\s+['"](\.\/[^'"]+)['"]/g)) {
      visit(resolve(dirname(file), `${match[1]}.ts`), [...parents, file]);
    }
  };
  visit(resolve('src/entities/admin/api/index.ts'), []);
});
