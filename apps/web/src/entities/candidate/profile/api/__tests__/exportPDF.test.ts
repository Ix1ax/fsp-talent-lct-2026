import { beforeEach, describe, expect, it, vi } from 'vitest';

const { adapter, ensure } = vi.hoisted(() => ({
  adapter: vi.fn(),
  ensure: vi.fn(),
}));
vi.mock('@/shared/api', async () => {
  const { createApi, attachErrorInterceptor } =
    await import('@/shared/api/base');
  const errors = await import('@/shared/api/errors');
  const { normalizeApiError } = await import('@/shared/api/normalizeApiError');
  const clientApi = createApi({ adapter });
  attachErrorInterceptor(clientApi);

  return {
    normalizeApiError,
    clientApi,
    ensureClientAccessToken: ensure,
    ...errors,
  };
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

import { ApiError } from '@/shared/api/errors';

import { exportCandidatePDF } from '../exportPDF';
describe('candidate PDF export', () => {
  it('returns the original PDF blob', async () => {
    const pdf = new Blob(['%PDF'], { type: 'application/pdf' });
    adapter.mockImplementation(async (config) => ({
      data: pdf,
      status: 200,
      headers: {},
      config,
    }));
    expect(await exportCandidatePDF()).toBe(pdf);
    expect(adapter.mock.calls[0][0]).toMatchObject({
      url: '/v1/me/profile/export.pdf',
      responseType: 'blob',
      timeout: 60000,
    });
  });
  it('decodes JSON errors received as blobs and preserves retry headers', async () => {
    adapter.mockRejectedValue(
      new ApiError(
        503,
        'Fallback',
        'unknown',
        new Blob([
          JSON.stringify({
            error: { code: 'export_busy', message: 'Повторите позже' },
          }),
        ]),
        { 'Retry-After': '2' },
      ),
    );
    await expect(exportCandidatePDF()).rejects.toMatchObject({
      status: 503,
      code: 'export_busy',
      message: 'Повторите позже',
      retryAfter: '2',
    });
  });
  it('preserves an undecodable error', async () => {
    const error = new ApiError(
      500,
      'Fallback',
      'unknown',
      new Blob(['invalid']),
    );
    adapter.mockRejectedValue(error);
    await expect(exportCandidatePDF()).rejects.toBe(error);
  });
});
