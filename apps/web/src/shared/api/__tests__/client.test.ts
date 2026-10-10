import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearClientAccessToken,
  getClientAccessToken,
  getClientSessionRevision,
  setClientAccessToken,
} from '@/shared/auth';

import { ensureClientAccessToken } from '../client';

vi.mock('@/shared/auth', () => ({
  clearClientAccessToken: vi.fn(),
  emitSessionExpired: vi.fn(),
  getClientAccessToken: vi.fn(),
  getClientSessionRevision: vi.fn(),
  setClientAccessToken: vi.fn(),
}));

const fetchMock = vi.fn();

describe('client session refresh', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('window', {});
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(getClientAccessToken).mockReturnValue(null);
    vi.mocked(getClientSessionRevision).mockReturnValue(0);
  });
  afterEach(() => vi.unstubAllGlobals());

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

  it('shares a single refresh even when browser locks are available', async () => {
    vi.stubGlobal('navigator', {
      locks: { request: vi.fn(async (_name, callback) => callback()) },
    });
    fetchMock.mockResolvedValue(Response.json({ accessToken: 'new' }));
    expect(
      await Promise.all([ensureClientAccessToken(), ensureClientAccessToken()]),
    ).toEqual(['new', 'new']);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(setClientAccessToken).toHaveBeenCalledWith('new');
  });
});
