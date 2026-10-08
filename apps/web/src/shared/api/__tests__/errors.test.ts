import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';

import { attachErrorInterceptor, createApi } from '../base';
import { ApiError, toApiError } from '../errors';

describe('API error response headers', () => {
  it('retains Retry-After and normalizes backend error details', () => {
    const error = toApiError(
      503,
      { error: { code: 'import_busy', message: 'Busy', retry_at: 'later' } },
      'Fallback',
      { 'Retry-After': '5' },
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error.retryAfter).toBe('5');
    expect(error.headers['retry-after']).toBe('5');
    expect(error.retryAt).toBe('later');
  });
  it('passes Axios response headers through the interceptor', async () => {
    const api = createApi({
      adapter: async (config) => {
        throw new AxiosError('Busy', 'ERR_BAD_RESPONSE', config, undefined, {
          status: 503,
          statusText: 'Unavailable',
          data: { error: { code: 'import_busy', message: 'Busy' } },
          headers: new AxiosHeaders({ 'Retry-After': '7' }),
          config,
        });
      },
    });
    attachErrorInterceptor(api);
    await expect(api.post('/resume')).rejects.toMatchObject({
      code: 'import_busy',
      retryAfter: '7',
    });
  });
});
