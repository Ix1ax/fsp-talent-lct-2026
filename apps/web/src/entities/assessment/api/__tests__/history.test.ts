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

import { getAssessmentHistory } from '../history';
describe('assessment history', () => {
  it('keeps pagination and nullable historical results', async () => {
    adapter.mockImplementation(async (config) => ({
      data: {
        items: [{ score_percent: null, stack_skill_id: null, category: null }],
        total: 1,
        limit: 10,
        offset: 20,
      },
      status: 200,
      headers: {},
      config,
    }));
    const result = await getAssessmentHistory({ limit: 10, offset: 20 });
    expect(adapter.mock.calls[0][0]).toMatchObject({
      url: '/v1/me/assessments/history',
      params: { limit: 10, offset: 20 },
    });
    expect(result.items[0]).toMatchObject({
      scorePercent: null,
      stackSkillId: null,
      category: null,
    });
  });
  it('uses default pagination and stops before auth when cancelled', async () => {
    await getAssessmentHistory();
    expect(adapter.mock.calls[0][0].params).toEqual({ limit: 20, offset: 0 });
    const controller = new AbortController();
    controller.abort();
    await expect(
      getAssessmentHistory({}, controller.signal),
    ).rejects.toBeTruthy();
    expect(ensure).toHaveBeenCalledOnce();
    expect(adapter).toHaveBeenCalledOnce();
  });
});
