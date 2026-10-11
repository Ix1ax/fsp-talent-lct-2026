import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearClientAccessToken,
  getClientAccessToken,
  getClientSessionRevision,
  setClientAccessToken,
} from '@/shared/auth';

import { clientApi, ensureClientAccessToken } from '../client';

vi.mock('@/shared/auth', () => ({
  clearClientAccessToken: vi.fn(),
  emitSessionExpired: vi.fn(),
  getClientAccessToken: vi.fn(),
  getClientSessionRevision: vi.fn(),
  setClientAccessToken: vi.fn(),
}));

const fetchMock = vi.fn();

describe('client session refresh', () => {
  const originalAdapter = clientApi.defaults.adapter;
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('window', {});
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(getClientAccessToken).mockReturnValue(null);
    vi.mocked(getClientSessionRevision).mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    clientApi.defaults.adapter = originalAdapter;
  });

  it.each([{}, { accessToken: 42 }, { accessToken: '' }, { accessToken: ' ' }])(
    'preserves auth state when refresh returns malformed token data: %j',
    async (body) => {
      fetchMock.mockResolvedValue(Response.json(body));
      await expect(ensureClientAccessToken()).rejects.toMatchObject({
        status: 503,
        code: 'auth_unavailable',
      });
      expect(setClientAccessToken).not.toHaveBeenCalled();
      expect(clearClientAccessToken).not.toHaveBeenCalled();
    },
  );

  it('retries a late 401 with the token already refreshed by another request', async () => {
    let token = 'old';
    vi.mocked(getClientAccessToken).mockImplementation(() => token);
    vi.mocked(setClientAccessToken).mockImplementation((value) => {
      token = value ?? '';
    });
    fetchMock.mockResolvedValue(Response.json({ accessToken: 'new' }));
    let rejectLate!: () => void;
    const unauthorized = (config: InternalAxiosRequestConfig) =>
      new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
        data: {},
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
      });
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      if (config.headers.Authorization === 'Bearer old') {
        if (config.url === '/late')
          return new Promise<never>((_resolve, reject) => {
            rejectLate = () => reject(unauthorized(config));
          });
        throw unauthorized(config);
      }
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    });
    clientApi.defaults.adapter = adapter;
    const first = clientApi.get('/first');
    const late = clientApi.get('/late');
    await first;
    rejectLate();
    await late;
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(adapter).toHaveBeenCalledTimes(4);
  });

  it('preserves the session on a temporary HTTP failure', async () => {
    fetchMock.mockResolvedValue(Response.json({}, { status: 503 }));
    await expect(ensureClientAccessToken()).rejects.toMatchObject({
      status: 503,
    });
    expect(clearClientAccessToken).not.toHaveBeenCalled();
  });

  it('clears the token for an expired session', async () => {
    fetchMock.mockResolvedValue(Response.json({}, { status: 401 }));
    expect(await ensureClientAccessToken()).toBeNull();
    expect(clearClientAccessToken).toHaveBeenCalledOnce();
  });

  it.each([200, 401])(
    'ignores a late %s response after auth state changes',
    async (status) => {
      let resolve: (response: Response) => void = () => {};
      fetchMock.mockImplementation(
        () =>
          new Promise<Response>((done) => {
            resolve = done;
          }),
      );
      const request = ensureClientAccessToken();
      const assertion = expect(request).rejects.toMatchObject({
        name: 'AbortError',
      });
      vi.mocked(getClientSessionRevision).mockReturnValue(1);
      resolve(Response.json({ accessToken: 'old' }, { status }));
      await assertion;
      expect(setClientAccessToken).not.toHaveBeenCalled();
      expect(clearClientAccessToken).not.toHaveBeenCalled();
    },
  );

  it('ignores a body received after logout', async () => {
    let resolve: (body: unknown) => void = () => {};
    fetchMock.mockResolvedValue({
      status: 200,
      ok: true,
      json: () =>
        new Promise((done) => {
          resolve = done;
        }),
    });
    const request = ensureClientAccessToken();
    const assertion = expect(request).rejects.toMatchObject({
      name: 'AbortError',
    });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    vi.mocked(getClientSessionRevision).mockReturnValue(1);
    resolve({ accessToken: 'old' });
    await assertion;
    expect(setClientAccessToken).not.toHaveBeenCalled();
  });

  it('bounds waiting for another tab and allows retry without dropping the session', async () => {
    const controller = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
    const lock = vi.fn(
      (_name, options, callback) =>
        new Promise((_resolve, reject) => {
          void callback;
          options.signal.addEventListener(
            'abort',
            () => reject(options.signal.reason),
            { once: true },
          );
        }),
    );
    vi.stubGlobal('navigator', { locks: { request: lock } });
    const request = ensureClientAccessToken();
    const assertion = expect(request).rejects.toMatchObject({
      name: 'TimeoutError',
    });
    controller.abort(
      new DOMException('Timed out waiting for auth lock', 'TimeoutError'),
    );
    await assertion;
    expect(fetchMock).not.toHaveBeenCalled();
    expect(clearClientAccessToken).not.toHaveBeenCalled();
    vi.mocked(AbortSignal.timeout).mockReturnValue(
      new AbortController().signal,
    );
    lock.mockImplementation(async (_name, _options, callback) => callback());
    fetchMock.mockResolvedValue(Response.json({ accessToken: 'new' }));
    expect(await ensureClientAccessToken()).toBe('new');
  });

  it('shares a single refresh even when browser locks are available', async () => {
    vi.stubGlobal('navigator', {
      locks: {
        request: vi.fn(async (_name, _options, callback) => callback()),
      },
    });
    fetchMock.mockResolvedValue(Response.json({ accessToken: 'new' }));
    expect(
      await Promise.all([ensureClientAccessToken(), ensureClientAccessToken()]),
    ).toEqual(['new', 'new']);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(setClientAccessToken).toHaveBeenCalledWith('new');
  });
});
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
