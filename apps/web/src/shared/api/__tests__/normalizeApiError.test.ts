import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../errors';
import { normalizeApiError } from '../normalizeApiError';

describe('normalizeApiError', () => {
  it('decodes backend details and preserves headers', async () => {
    const error = new ApiError(
      503,
      'Fallback',
      'unknown',
      new Blob([
        JSON.stringify({
          error: {
            code: 'busy',
            message: 'Try later',
            retry_at: 'tomorrow',
            attempt_id: 'attempt',
          },
        }),
      ]),
      { 'Retry-After': '5' },
    );
    await expect(normalizeApiError(error)).resolves.toMatchObject({
      status: 503,
      code: 'busy',
      message: 'Try later',
      retryAfter: '5',
      retryAt: 'tomorrow',
      attemptId: 'attempt',
    });
  });

  it.each(['invalid JSON', '', '<html>Unavailable</html>'])(
    'preserves the original error for %s',
    async (body) => {
      const error = new ApiError(502, 'Fallback', 'gateway', new Blob([body]));
      expect(await normalizeApiError(error)).toBe(error);
    },
  );

  it('preserves an unreadable blob', async () => {
    const blob = new Blob(['{}']);
    vi.spyOn(blob, 'text').mockRejectedValue(new Error('Read failed'));
    const error = new ApiError(500, 'Fallback', 'unknown', blob);
    expect(await normalizeApiError(error)).toBe(error);
  });

  it.each([
    new Error('Network'),
    new ApiError(403, 'Forbidden'),
    null,
    'failure',
  ])('preserves other thrown values', async (error) => {
    expect(await normalizeApiError(error)).toBe(error);
  });
});
