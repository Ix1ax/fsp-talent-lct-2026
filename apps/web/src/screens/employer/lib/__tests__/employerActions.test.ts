import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { adapter, ensure } = vi.hoisted(() => ({
  adapter: vi.fn(),
  ensure: vi.fn(),
}));
vi.mock('@/shared/api/client', async () => {
  const { createApi, attachErrorInterceptor } =
    await import('@/shared/api/base');
  const clientApi = createApi({ adapter });
  attachErrorInterceptor(clientApi);
  return { clientApi, ensureClientAccessToken: ensure };
});

import {
  getCompanyVerification,
  requestCompanyVerification,
} from '@/entities/company';
import {
  closeCompanyTask,
  downloadCompanyTask,
  getCompanyTask,
} from '@/entities/company-task';
import { getBankCandidate, viewBankCandidate } from '@/entities/employer-bank';

const response = (
  config: InternalAxiosRequestConfig,
  data: unknown,
  status = 200,
) => ({ config, data, status, statusText: 'OK', headers: {} });

beforeEach(() => {
  ensure.mockReset();
  adapter.mockReset();
  adapter.mockImplementation(async (config) => response(config, {}));
});

describe('employer company-scoped actions', () => {
  it('loads a candidate without recording a view until the explicit action', async () => {
    await getBankCandidate('company', 'candidate');
    expect(adapter).toHaveBeenCalledOnce();
    expect(adapter.mock.calls[0][0]).toMatchObject({
      method: 'get',
      url: '/v1/companies/company/candidates/candidate',
    });
    adapter.mockImplementation(async (config) =>
      response(config, {
        viewed: true,
        has_offer: false,
        last_viewed_at: '2026-10-10T12:00:00Z',
        next_available_at: '2026-11-09T12:00:00Z',
        last_offered_at: null,
      }),
    );
    const view = await viewBankCandidate('company/one', 'candidate/one');
    expect(view).toMatchObject({
      viewed: true,
      hasOffer: false,
      lastViewedAt: '2026-10-10T12:00:00Z',
      nextAvailableAt: '2026-11-09T12:00:00Z',
    });
    expect(adapter.mock.calls[1][0]).toMatchObject({
      method: 'post',
      url: '/v1/companies/company%2Fone/candidates/candidate%2Fone/view',
      data: undefined,
    });
  });

  it('reads verification details and submits without client-controlled status or document IDs', async () => {
    adapter.mockImplementation(async (config) =>
      response(config, {
        company_id: 'company',
        status: 'rejected',
        version: 2,
        reason: 'Нечитаемый документ',
        document_ids: ['document'],
        requested_at: null,
        reviewed_at: null,
      }),
    );
    const state = await getCompanyVerification('company/one');
    expect(state).toMatchObject({
      companyId: 'company',
      status: 'rejected',
      reason: 'Нечитаемый документ',
      documentIds: ['document'],
    });
    await requestCompanyVerification('company/one');
    expect(adapter.mock.calls[0][0]).toMatchObject({
      method: 'get',
      url: '/v1/companies/company%2Fone/verification',
    });
    expect(adapter.mock.calls[1][0]).toMatchObject({
      method: 'post',
      url: '/v1/companies/company%2Fone/verification/request',
      data: undefined,
    });
  });

  it('loads and closes employer tasks using company endpoints even when hidden or closed', async () => {
    adapter.mockImplementation(async (config) =>
      response(config, {
        id: 'task',
        company_id: 'company',
        moderation_status: 'hidden',
        status: 'closed',
      }),
    );
    expect(await getCompanyTask('company/one', 'task/one')).toMatchObject({
      companyId: 'company',
      moderationStatus: 'hidden',
      status: 'closed',
    });
    expect(await closeCompanyTask('company/one', 'task/one')).toMatchObject({
      status: 'closed',
    });
    expect(adapter.mock.calls[0][0]).toMatchObject({
      method: 'get',
      url: '/v1/companies/company%2Fone/tasks/task%2Fone',
    });
    expect(adapter.mock.calls[1][0]).toMatchObject({
      method: 'post',
      url: '/v1/companies/company%2Fone/tasks/task%2Fone/close',
      data: undefined,
    });
  });

  it('downloads condition bytes through the private employer endpoint', async () => {
    const blob = new Blob(['condition']);
    adapter.mockImplementation(async (config) => response(config, blob));
    expect(await downloadCompanyTask('company/one', 'task/one')).toBe(blob);
    expect(adapter.mock.calls[0][0]).toMatchObject({
      url: '/v1/companies/company%2Fone/tasks/task%2Fone/file',
      responseType: 'blob',
      timeout: 60_000,
    });
  });

  it('keeps structured API errors from binary downloads', async () => {
    adapter.mockImplementation(async (config) => {
      throw new AxiosError(
        'Failed',
        'ERR_BAD_REQUEST',
        config,
        undefined,
        response(
          config,
          new Blob(
            [
              JSON.stringify({
                error: { code: 'forbidden', message: 'Нет доступа к условию' },
              }),
            ],
            { type: 'application/json' },
          ),
          403,
        ),
      );
    });
    await expect(downloadCompanyTask('company', 'task')).rejects.toMatchObject({
      status: 403,
      code: 'forbidden',
      message: 'Нет доступа к условию',
    });
    expect(adapter).toHaveBeenCalledOnce();
  });

  it.each([
    getCompanyVerification.bind(null, 'company'),
    requestCompanyVerification.bind(null, 'company'),
    getCompanyTask.bind(null, 'company', 'task'),
    closeCompanyTask.bind(null, 'company', 'task'),
    downloadCompanyTask.bind(null, 'company', 'task'),
    viewBankCandidate.bind(null, 'company', 'candidate'),
  ])(
    'does not send cancelled actions, including cancellation during token refresh',
    async (request) => {
      const before = new AbortController();
      before.abort();
      await expect(request(before.signal)).rejects.toBeTruthy();
      expect(ensure).not.toHaveBeenCalled();
      const during = new AbortController();
      ensure.mockImplementation(async () => during.abort());
      await expect(request(during.signal)).rejects.toBeTruthy();
      expect(adapter).not.toHaveBeenCalled();
    },
  );
});
