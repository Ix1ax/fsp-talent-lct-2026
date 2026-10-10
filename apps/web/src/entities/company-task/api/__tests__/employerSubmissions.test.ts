import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { adapter, ensure } = vi.hoisted(() => ({
  adapter: vi.fn(),
  ensure: vi.fn(),
}));

vi.mock('@/shared/api', async () => {
  const { attachErrorInterceptor, createApi } =
    await import('@/shared/api/base');
  const errors = await import('@/shared/api/errors');
  const { normalizeApiError } = await import('@/shared/api/normalizeApiError');
  const clientApi = createApi({ adapter });
  attachErrorInterceptor(clientApi);
  return {
    normalizeApiError,
    ...errors,
    clientApi,
    ensureClientAccessToken: ensure,
  };
});

import {
  downloadCompanyTaskSolution,
  getCompanyTaskSubmission,
  listCompanyTaskSubmissions,
  reviewCompanyTaskSubmission,
} from '../employerSubmissions';
import { createCompanyTask } from '../employerTasks';

const response = (
  config: InternalAxiosRequestConfig,
  data: unknown,
  status = 200,
) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config,
});

beforeEach(() => {
  adapter.mockReset();
  ensure.mockReset();
  adapter.mockImplementation(async (config) =>
    response(config, {
      id: 'submission',
      task_id: 'task',
      candidate_id: 'profile',
      status: 'reviewed',
      score: 0,
      feedback: null,
    }),
  );
});

describe('employer task submissions API', () => {
  it('publishes exactly one file and only allowed multipart fields', async () => {
    const file = new File(['condition'], 'condition.txt');
    await createCompanyTask('company/one', {
      title: 'Task',
      file,
      specializationId: 1,
      gradeId: 2,
      deadlineAt: '2030-01-01T00:00:00Z',
      description: 'Description',
    });
    const config = adapter.mock.calls[0][0];
    expect(config.url).toBe('/v1/companies/company%2Fone/tasks');
    expect(config.method).toBe('post');
    expect(config.timeout).toBe(120_000);
    expect([...config.data.keys()].sort()).toEqual([
      'deadline_at',
      'description',
      'file',
      'grade_id',
      'specialization_id',
      'title',
    ]);
    expect(config.data.getAll('file')).toEqual([file]);
    expect(config.data.get('specialization_id')).toBe('1');
    expect(ensure).toHaveBeenCalledOnce();
  });

  it('omits empty optional publication fields', async () => {
    await createCompanyTask('company', {
      title: 'Task',
      file: new File(['condition'], 'condition.txt'),
    });
    expect([...adapter.mock.calls[0][0].data.keys()].sort()).toEqual([
      'file',
      'title',
    ]);
  });
  it('keeps URL scope separate from narrowing filters and normalizes pagination', async () => {
    await listCompanyTaskSubmissions('company', 'task', {
      companyId: 'filter-company',
      taskId: 'filter-task',
      candidateId: 'profile',
      status: 'reviewed',
      sort: 'score',
      limit: 50,
      offset: 100,
    });

    expect(ensure).toHaveBeenCalledOnce();
    expect(adapter.mock.calls[0][0]).toMatchObject({
      method: 'get',
      url: '/v1/companies/company/tasks/task/submissions',
      params: {
        company_id: 'filter-company',
        task_id: 'filter-task',
        candidate_id: 'profile',
        status: 'reviewed',
        sort: 'score',
        limit: 50,
        offset: 100,
      },
    });
  });

  it('uses default pagination and preserves explicitly supplied offset zero', async () => {
    await listCompanyTaskSubmissions('company', 'task');
    expect(adapter.mock.calls[0][0].params).toEqual({ limit: 20, offset: 0 });
  });

  it('encodes all path identifiers and returns the candidate profile ID', async () => {
    const result = await getCompanyTaskSubmission(
      'company/a',
      'task/b',
      'answer/c',
    );
    expect(adapter.mock.calls[0][0].url).toBe(
      '/v1/companies/company%2Fa/tasks/task%2Fb/submissions/answer%2Fc',
    );
    expect(result).toMatchObject({
      taskId: 'task',
      candidateId: 'profile',
      score: 0,
    });
  });

  it('preserves score zero and sends only the fields of the current review', async () => {
    await reviewCompanyTaskSubmission('company', 'task', 'submission', {
      score: 0,
    });
    await reviewCompanyTaskSubmission('company', 'task', 'submission', {
      feedback: 'Проверено',
    });
    expect(adapter.mock.calls[0][0]).toMatchObject({
      method: 'patch',
      url: '/v1/companies/company/tasks/task/submissions/submission/review',
    });
    expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual({ score: 0 });
    expect(JSON.parse(adapter.mock.calls[1][0].data)).toEqual({
      feedback: 'Проверено',
    });
  });

  it('downloads a private solution as a blob', async () => {
    const blob = new Blob(['solution'], { type: 'text/plain' });
    adapter.mockImplementation(async (config) => response(config, blob));
    expect(
      await downloadCompanyTaskSolution('company', 'task', 'submission'),
    ).toBe(blob);
    expect(adapter.mock.calls[0][0]).toMatchObject({
      url: '/v1/companies/company/tasks/task/submissions/submission/file',
      responseType: 'blob',
      timeout: 60_000,
    });
  });

  it('preserves JSON errors returned as blobs when a solution becomes unavailable', async () => {
    adapter.mockImplementation(async (config) => {
      const result = response(
        config,
        new Blob(
          [
            JSON.stringify({
              error: { code: 'not_found', message: 'Решение недоступно' },
            }),
          ],
          { type: 'application/json' },
        ),
        404,
      );
      throw new AxiosError(
        'Request failed',
        'ERR_BAD_REQUEST',
        config,
        undefined,
        result,
      );
    });
    await expect(
      downloadCompanyTaskSolution('company', 'task', 'submission'),
    ).rejects.toMatchObject({
      status: 404,
      code: 'not_found',
      message: 'Решение недоступно',
    });
  });

  it.each([403, 404])(
    'propagates access restrictions (%i) without fallback requests',
    async (status) => {
      adapter.mockImplementation(async (config) => {
        throw new AxiosError(
          'Request failed',
          'ERR_BAD_REQUEST',
          config,
          undefined,
          response(
            config,
            {
              error: {
                code: status === 403 ? 'forbidden' : 'not_found',
                message: 'Недоступно',
              },
            },
            status,
          ),
        );
      });
      await expect(
        getCompanyTaskSubmission('company', 'task', 'submission'),
      ).rejects.toMatchObject({ status });
      expect(adapter).toHaveBeenCalledOnce();
    },
  );

  it('does not authorize or issue any request after cancellation', async () => {
    const controller = new AbortController();
    controller.abort();
    const signal = controller.signal;
    const requests = [
      listCompanyTaskSubmissions('company', 'task', {}, signal),
      getCompanyTaskSubmission('company', 'task', 'submission', signal),
      downloadCompanyTaskSolution('company', 'task', 'submission', signal),
      reviewCompanyTaskSubmission(
        'company',
        'task',
        'submission',
        { score: 100 },
        signal,
      ),
    ];
    for (const request of requests) await expect(request).rejects.toBeTruthy();
    expect(ensure).not.toHaveBeenCalled();
    expect(adapter).not.toHaveBeenCalled();
  });

  it('does not issue a request if cancelled during authorization', async () => {
    const controller = new AbortController();
    ensure.mockImplementation(async () => controller.abort());
    await expect(
      listCompanyTaskSubmissions('company', 'task', {}, controller.signal),
    ).rejects.toBeTruthy();
    expect(adapter).not.toHaveBeenCalled();
  });
});
