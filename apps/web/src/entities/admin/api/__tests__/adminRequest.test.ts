import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  AdminApiError,
  adminLogin,
  adminLogout,
  adminRequest,
  queryString,
} from '../index';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe('adminRequest', () => {
  it('handles a 204 without trying to parse JSON and isolates the admin token', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    await expect(
      adminRequest('admin-token', '/auth/logout', z.undefined(), {
        method: 'POST',
      }),
    ).resolves.toBeUndefined();
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/v1/admin/auth/logout');
    expect(options.credentials).toBe('omit');
    expect(options.cache).toBe('no-store');
    expect(options.headers.get('Authorization')).toBe('Bearer admin-token');
  });
  it('keeps shortages at the top level and diagnostic headers', async () => {
    const shortage = {
      skill_id: 'skill',
      difficulty: 2,
      required: 5,
      available: 3,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'insufficient_questions',
              message: 'Мало заданий',
            },
            shortages: [shortage],
          }),
          { status: 409, headers: { 'X-Request-ID': 'request-1' } },
        ),
      ),
    );
    await expect(
      adminRequest('token', '/assessments/templates/id/publish', z.unknown(), {
        method: 'POST',
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'insufficient_questions',
      requestId: 'request-1',
      shortages: [shortage],
    });
  });
  it('expires only protected requests, not invalid login credentials', async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: { code: 'unauthorized' } }), {
            status: 401,
          }),
        ),
      ),
    );
    await expect(
      adminLogin('wrong@example.org', 'wrong'),
    ).rejects.toBeInstanceOf(AdminApiError);
    expect(dispatchEvent).not.toHaveBeenCalled();
    await expect(
      adminRequest('expired', '/auth/me', z.unknown()),
    ).rejects.toBeInstanceOf(AdminApiError);
    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(dispatchEvent.mock.calls[0][0].type).toBe('admin:expired');
  });
  it('does not expire a session on 403 or retry failed POST requests', async () => {
    const dispatchEvent = vi.fn();
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response('Proxy error', { status: 403 }));
    vi.stubGlobal('window', { dispatchEvent });
    vi.stubGlobal('fetch', fetch);
    await expect(
      adminRequest('token', '/admins', z.unknown(), {
        method: 'POST',
        body: {},
      }),
    ).rejects.toMatchObject({ message: 'Ошибка HTTP 403' });
    expect(dispatchEvent).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('rejects malformed successful payloads instead of trusting a generic type', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"items":"wrong"}')),
    );
    await expect(
      adminRequest(
        'token',
        '/catalogs/skills',
        z.object({ items: z.array(z.string()) }),
      ),
    ).rejects.toThrow('неожиданный формат');
  });
  it('preserves aborts and warns about ambiguous mutation network failures without retry', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetch);
    await expect(
      adminRequest('token', '/admins', z.unknown(), {
        method: 'POST',
        body: {},
      }),
    ).rejects.toMatchObject({ code: 'network', status: 0 });
    expect(fetch).toHaveBeenCalledOnce();
    const aborted = new DOMException('Aborted', 'AbortError');
    fetch.mockRejectedValueOnce(aborted);
    await expect(adminRequest('token', '/admins', z.unknown())).rejects.toBe(
      aborted,
    );
  });
  it('bounds waiting for headers and never retries a timed out mutation', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetch);
    const request = adminRequest('token', '/admins', z.unknown(), {
      method: 'POST',
    });
    const assertion = expect(request).rejects.toMatchObject({
      code: 'timeout',
      status: 0,
      message: expect.stringContaining('Перед повтором проверьте данные'),
    });
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('bounds body reading and retains response diagnostic headers', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        headers: new Headers({
          'X-Request-ID': 'slow-body',
          'Retry-After': '10',
        }),
        text: () => new Promise(() => {}),
      }),
    );
    const request = adminRequest('token', '/admins', z.unknown());
    const assertion = expect(request).rejects.toMatchObject({
      code: 'timeout',
      requestId: 'slow-body',
      retryAfter: '10',
    });
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('preserves navigation cancellation and removes timers and listeners', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetch);
    const request = adminRequest('token', '/admins', z.unknown(), {
      signal: controller.signal,
    });
    controller.abort();
    // The rejection carries the caller's AbortError, not a timeout/API error.
    await expect(request).rejects.toBe(controller.signal.reason);
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });
  it('does not send an already cancelled request', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(
      adminRequest('token', '/admins', z.unknown(), {
        signal: controller.signal,
      }),
    ).rejects.toBe(controller.signal.reason);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('cleans up on success and bounds logout to five seconds', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    await adminRequest('token', '/admins', z.unknown(), {
      signal: controller.signal,
    });
    expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    fetch.mockImplementation(() => new Promise(() => {}));
    const assertion = expect(adminLogout('token')).rejects.toMatchObject({
      code: 'timeout',
    });
    await vi.advanceTimersByTimeAsync(5_000);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('encodes queries and skips empty optional filters', () => {
    expect(queryString({ q: 'C++ & Go', status: '', offset: 0 })).toBe(
      'q=C%2B%2B+%26+Go&offset=0',
    );
  });
});
