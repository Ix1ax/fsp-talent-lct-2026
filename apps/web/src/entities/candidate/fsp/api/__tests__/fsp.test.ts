import { beforeEach, describe, expect, it, vi } from 'vitest';

const { adapter, ensure } = vi.hoisted(() => ({
  adapter: vi.fn(),
  ensure: vi.fn(),
}));
vi.mock('@/shared/api', async () => {
  const { createApi, attachErrorInterceptor } =
    await import('@/shared/api/base');
  const errors = await import('@/shared/api/errors');
  const clientApi = createApi({ adapter });
  attachErrorInterceptor(clientApi);
  return { clientApi, ensureClientAccessToken: ensure, ...errors };
});
beforeEach(() => {
  adapter.mockReset();
  ensure.mockReset();
  adapter.mockImplementation(async (config) => ({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }));
});

import { getFSP, linkFSP, syncFSP, unlinkFSP } from '../fsp';
describe('FSP integration', () => {
  it('keeps absent links and nullable achievement places', async () => {
    adapter.mockImplementation(async (config) => ({
      data: { link: null, items: [{ event_id: 'event', place: null }] },
      status: 200,
      headers: {},
      config,
    }));
    expect(await getFSP()).toEqual({
      link: null,
      items: [{ eventId: 'event', place: null }],
    });
  });
  it('links and syncs without transmitting identity or a request body', async () => {
    await linkFSP();
    await syncFSP();
    expect(
      adapter.mock.calls.map(([config]) => ({
        url: config.url,
        method: config.method,
        data: config.data,
      })),
    ).toEqual([
      { url: '/v1/me/fsp/link', method: 'post', data: undefined },
      { url: '/v1/me/fsp/sync', method: 'post', data: undefined },
    ]);
  });
  it('accepts an empty 204 response when unlinking', async () => {
    adapter.mockImplementation(async (config) => ({
      data: '',
      status: 204,
      headers: {},
      config,
    }));
    expect(await unlinkFSP()).toBeUndefined();
    expect(adapter.mock.calls[0][0]).toMatchObject({
      url: '/v1/me/fsp',
      method: 'delete',
    });
  });
});
