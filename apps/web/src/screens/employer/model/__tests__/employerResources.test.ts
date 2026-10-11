import { expect, it, vi } from 'vitest';

import type { EmployerGateway } from '../../lib/gateway';
import { loadEmployerCompanies } from '../useEmployerResources';

it('resolves an empty company list independently of catalogs', async () => {
  const api = {
    companies: vi.fn().mockResolvedValue({ items: [], limit: 100 }),
    catalogs: vi.fn(),
  } as unknown as EmployerGateway;
  expect(
    await loadEmployerCompanies(api, new AbortController().signal),
  ).toEqual([]);
  expect(api.catalogs).not.toHaveBeenCalled();
});
it('preserves companies across pages and rejects a failed second page', async () => {
  const companies = vi
    .fn()
    .mockResolvedValueOnce({
      items: Array.from({ length: 100 }, (_, id) => ({ id: String(id) })),
      limit: 100,
    })
    .mockRejectedValueOnce(new Error('503'));
  const api = { companies } as unknown as EmployerGateway;
  await expect(
    loadEmployerCompanies(api, new AbortController().signal),
  ).rejects.toThrow('503');
});
it('never accepts a late company response after cancellation', async () => {
  let complete!: (page: unknown) => void;
  const api = {
    companies: vi.fn(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    ),
  } as unknown as EmployerGateway;
  const controller = new AbortController();
  const result = loadEmployerCompanies(api, controller.signal);
  controller.abort();
  complete({ items: [{ id: 'old-company' }], limit: 100 });
  await expect(result).rejects.toMatchObject({ name: 'AbortError' });
});
