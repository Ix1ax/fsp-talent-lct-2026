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

import { getCandidateOnboarding, putCandidateSurvey } from '../onboarding';
describe('candidate onboarding', () => {
  it('preserves consent step with hidden data and disables caching', async () => {
    adapter.mockImplementation(async (config) => ({
      data: { next_step: 'consent', survey: null, latest_attempt: null },
      status: 200,
      headers: {},
      config,
    }));
    expect(await getCandidateOnboarding()).toEqual({
      nextStep: 'consent',
      survey: null,
      latestAttempt: null,
    });
    expect(adapter.mock.calls[0][0].headers['Cache-Control']).toBe('no-cache');
  });
  it('serializes the survey including an explicit empty soft skills list', async () => {
    await putCandidateSurvey({
      stackSkillId: 'skill',
      industry: 'IT',
      specializationId: 1,
      gradeId: 2,
      softSkills: [],
    });
    expect(adapter.mock.calls[0][0]).toMatchObject({
      method: 'put',
      url: '/v1/me/profile/onboarding',
    });
    expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual({
      stack_skill_id: 'skill',
      industry: 'IT',
      specialization_id: 1,
      grade_id: 2,
      soft_skills: [],
    });
  });
  it('does not save after cancellation during auth', async () => {
    const controller = new AbortController();
    ensure.mockImplementation(async () => controller.abort());
    await expect(
      putCandidateSurvey(
        {
          stackSkillId: 'skill',
          industry: 'IT',
          specializationId: 1,
          gradeId: 2,
        },
        controller.signal,
      ),
    ).rejects.toBeTruthy();
    expect(adapter).not.toHaveBeenCalled();
  });
});
