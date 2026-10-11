import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import {
  invalidateAdminCatalogs,
  setAdminCatalogSession,
} from '../catalogCache';
import {
  createAdminCatalogItem,
  deleteAdminCatalogItem,
  getAdminCatalogs,
  getAdminSkill,
  loadAdminCatalog,
  updateAdminCatalogItem,
} from '../catalogs';

const item = (id: number) => ({
  id: String(id),
  code: `skill-${id}`,
  name: `Skill ${id}`,
  active: true,
  moderation_status: 'approved',
});
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
const fetchMock = vi.fn();
beforeEach(() => {
  setAdminCatalogSession(null);
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  setAdminCatalogSession(null);
  vi.unstubAllGlobals();
});
const serveCatalog = (count: number, total = false) =>
  fetchMock.mockImplementation((url: string) => {
    const params = new URL(url, 'http://localhost').searchParams;
    const limit = Number(params.get('limit'));
    const offset = Number(params.get('offset'));
    return Promise.resolve(
      response({
        items: Array.from(
          { length: Math.min(limit, Math.max(0, count - offset)) },
          (_, index) => item(offset + index),
        ),
        limit,
        offset,
        ...(total ? { total: count } : {}),
      }),
    );
  });
it.each([0, 99, 100, 101])(
  'completely loads %s records and reuses completed data',
  async (count) => {
    serveCatalog(count);
    expect(await loadAdminCatalog('token', 'specializations')).toHaveLength(
      count,
    );
    const requests = fetchMock.mock.calls.length;
    expect(await loadAdminCatalog('token', 'specializations')).toHaveLength(
      count,
    );
    expect(fetchMock).toHaveBeenCalledTimes(requests);
  },
);
it('reports pagination limit instead of returning 10100 items as complete', async () => {
  serveCatalog(10101);
  await expect(loadAdminCatalog('token', 'specializations')).rejects.toThrow(
    'предел загрузки',
  );
  expect(fetchMock).toHaveBeenCalledTimes(101);
});
it('allows exactly 10100 records only when server confirms total', async () => {
  serveCatalog(10100, true);
  expect(await loadAdminCatalog('token', 'specializations')).toHaveLength(
    10100,
  );
});
it('rejects ambiguous completion at 10100 without a total', async () => {
  serveCatalog(10100);
  await expect(loadAdminCatalog('token', 'specializations')).rejects.toThrow(
    'предел загрузки',
  );
});
it('reports failure of one page, independently of another catalog, and retries failed pages', async () => {
  fetchMock.mockImplementation((url: string) => {
    const params = new URL(url, 'http://localhost').searchParams;
    const offset = Number(params.get('offset'));
    if (url.includes('specializations'))
      return Promise.resolve(response({ items: [], limit: 100, offset: 0 }));
    if (offset === 100)
      return Promise.resolve(response({ message: 'unavailable' }, 503));
    return Promise.resolve(
      response({
        items: Array.from({ length: 100 }, (_, i) => item(i)),
        limit: 100,
        offset,
      }),
    );
  });
  const results = await Promise.allSettled([
    loadAdminCatalog('token', 'grades'),
    loadAdminCatalog('token', 'specializations'),
  ]);
  expect(results[0].status).toBe('rejected');
  expect(results[1]).toEqual({ status: 'fulfilled', value: [] });
  await expect(loadAdminCatalog('token', 'grades')).rejects.toThrow();
  expect(
    fetchMock.mock.calls.filter(([url]) => url.includes('offset=100')),
  ).toHaveLength(2);
});
it('rejects a short page if the reported total requires more items', async () => {
  fetchMock.mockResolvedValue(
    response({ items: [], total: 101, limit: 100, offset: 0 }),
  );
  await expect(loadAdminCatalog('token', 'grades')).rejects.toThrow(
    'неполный справочник',
  );
});
it('deduplicates concurrent readers and preserves another reader when one cancels', async () => {
  let complete!: (response: Response) => void;
  fetchMock.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const controller = new AbortController();
  const first = getAdminCatalogs(
    'token',
    'skills',
    { limit: 50 },
    controller.signal,
  );
  const second = getAdminCatalogs('token', 'skills', { limit: 50 });
  const cancelled = expect(first).rejects.toMatchObject({ name: 'AbortError' });
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  controller.abort();
  await cancelled;
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(false);
  complete(response({ items: [item(1)], limit: 50, offset: 0 }));
  expect((await second).items).toHaveLength(1);
  expect(await getAdminSkill('token', '1')).toMatchObject({ name: 'Skill 1' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('aborts transport when the last reader leaves; a late reply cannot populate cache', async () => {
  let complete!: (response: Response) => void;
  fetchMock.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const controller = new AbortController();
  const pending = getAdminCatalogs(
    'token',
    'skills',
    { q: 'old', limit: 50 },
    controller.signal,
  );
  const cancelled = expect(pending).rejects.toMatchObject({
    name: 'AbortError',
  });
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  controller.abort();
  await cancelled;
  await Promise.resolve();
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  complete(response({ items: [item(1)], limit: 50, offset: 0 }));
  serveCatalog(0);
  expect(
    (await getAdminCatalogs('token', 'skills', { q: 'new', limit: 50 })).items,
  ).toEqual([]);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it('clears cached records on logout and account switch', async () => {
  serveCatalog(1);
  await getAdminCatalogs('a', 'skills');
  setAdminCatalogSession(null);
  serveCatalog(0);
  expect((await getAdminCatalogs('b', 'skills')).items).toEqual([]);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it.each(['create', 'update', 'delete'] as const)(
  'invalidates only the modified catalog after %s',
  async (operation) => {
    serveCatalog(1);
    await loadAdminCatalog('token', 'grades');
    await loadAdminCatalog('token', 'specializations');
    const loadedCalls = fetchMock.mock.calls.length;
    fetchMock.mockResolvedValueOnce(
      operation === 'delete'
        ? new Response(null, { status: 204 })
        : response(item(2)),
    );
    if (operation === 'create')
      await createAdminCatalogItem('token', 'grades', {
        name: 'New',
        code: 'new',
      });
    if (operation === 'update')
      await updateAdminCatalogItem('token', 'grades', '1', { name: 'New' });
    if (operation === 'delete')
      await deleteAdminCatalogItem('token', 'grades', '1');
    await loadAdminCatalog('token', 'grades');
    await loadAdminCatalog('token', 'specializations');
    expect(fetchMock).toHaveBeenCalledTimes(loadedCalls + 2);
  },
);
it('invalidation rejects a pending request and discards its late response', async () => {
  let complete!: (response: Response) => void;
  fetchMock.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const pending = getAdminCatalogs('a', 'skills');
  const cancelled = expect(pending).rejects.toMatchObject({
    name: 'AbortError',
  });
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  invalidateAdminCatalogs('skills');
  await cancelled;
  complete(response({ items: [item(1)], limit: 100, offset: 0 }));
  serveCatalog(0);
  expect((await getAdminCatalogs('a', 'skills')).items).toEqual([]);
});

it('Strict Mode cancellation and immediate subscription share the pending transport', async () => {
  let complete!: (response: Response) => void;
  fetchMock.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const controller = new AbortController();
  const first = getAdminCatalogs(
    'token',
    'skills',
    { limit: 50 },
    controller.signal,
  );
  const cancelled = expect(first).rejects.toMatchObject({ name: 'AbortError' });
  controller.abort();
  const second = getAdminCatalogs('token', 'skills', { limit: 50 });
  await cancelled;
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  complete(response({ items: [], limit: 50, offset: 0 }));
  expect((await second).items).toEqual([]);
});
it('switching accounts rejects an in-flight result from the previous administrator', async () => {
  let complete!: (response: Response) => void;
  fetchMock.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const old = getAdminCatalogs('old-token', 'skills');
  const cancelled = expect(old).rejects.toMatchObject({ name: 'AbortError' });
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  setAdminCatalogSession('new-token');
  await cancelled;
  complete(response({ items: [item(1)], limit: 100, offset: 0 }));
  serveCatalog(0);
  expect((await getAdminCatalogs('new-token', 'skills')).items).toEqual([]);
});

it('refreshes a selected skill after archive and reports deletion instead of serving its old label', async () => {
  fetchMock.mockResolvedValueOnce(response(item(1)));
  expect((await getAdminSkill('token', '1')).active).toBe(true);
  fetchMock.mockResolvedValueOnce(response({ ...item(1), active: false }));
  await updateAdminCatalogItem('token', 'skills', '1', { active: false });
  fetchMock.mockResolvedValueOnce(response({ ...item(1), active: false }));
  expect((await getAdminSkill('token', '1')).active).toBe(false);
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
  await deleteAdminCatalogItem('token', 'skills', '1');
  fetchMock.mockResolvedValueOnce(
    response({ error: { code: 'not_found', message: 'Deleted' } }, 404),
  );
  await expect(getAdminSkill('token', '1')).rejects.toMatchObject({
    status: 404,
  });
});
it('shows a newly created item on the next lookup without repeating a mutation', async () => {
  serveCatalog(0);
  expect((await getAdminCatalogs('token', 'grades')).items).toEqual([]);
  fetchMock.mockResolvedValueOnce(response(item(1)));
  await createAdminCatalogItem('token', 'grades', { code: 'new', name: 'New' });
  fetchMock.mockResolvedValueOnce(
    response({ items: [item(1)], limit: 100, offset: 0 }),
  );
  expect(
    (await getAdminCatalogs('token', 'grades')).items.map((value) => value.id),
  ).toEqual(['1']);
  expect(
    fetchMock.mock.calls.filter(([, options]) => options.method === 'POST'),
  ).toHaveLength(1);
});
