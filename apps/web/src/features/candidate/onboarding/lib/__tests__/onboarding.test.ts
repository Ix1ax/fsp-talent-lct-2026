import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CandidateOnboarding } from '@/entities/candidate/profile';

import { getOnboardingAction } from '../getOnboardingAction';
import { loadCandidateOnboarding } from '../loadCandidateOnboarding';
const api = vi.hoisted(() => ({ get: vi.fn(), attempt: vi.fn() }));
vi.mock('@/entities/candidate/profile', () => ({
  getCandidateOnboarding: api.get,
}));
vi.mock('@/entities/assessment', () => ({ getAssessmentAttempt: api.attempt }));
const base: CandidateOnboarding = {
  nextStep: 'survey',
  survey: null,
  latestAttempt: null,
};
beforeEach(() => {
  vi.clearAllMocks();
});
describe('onboarding navigation', () => {
  it('maps consent, profile, survey, testing and complete to reachable sections', () => {
    const cases = {
      consent: '/candidate/consents',
      profile: '/candidate/profile',
      survey: '/candidate/survey',
      test: '/candidate/assessments',
      complete: '/candidate/readiness',
    } as const;
    for (const [step, href] of Object.entries(cases))
      expect(
        getOnboardingAction({
          ...base,
          nextStep: step as CandidateOnboarding['nextStep'],
        }).href,
      ).toBe(href);
  });
  it('resumes the own attempt and handles a missing attempt safely', () => {
    const latestAttempt = {
      id: 'attempt/id',
      status: 'active',
      deadlineAt: '',
      specializationId: 1,
      gradeId: 2,
      stackSkillId: null,
      stackName: null,
    } as const;
    expect(
      getOnboardingAction({ ...base, nextStep: 'in_progress', latestAttempt })
        .href,
    ).toBe('/candidate/assessments/attempt%2Fid');
    expect(getOnboardingAction({ ...base, nextStep: 'in_progress' }).href).toBe(
      '/candidate/assessments',
    );
  });
  it('finalizes an expired attempt before choosing the next step', async () => {
    const expired = {
      ...base,
      nextStep: 'test',
      latestAttempt: {
        id: 'attempt',
        status: 'active',
        deadlineAt: '2000-01-01T00:00:00Z',
        specializationId: 1,
        gradeId: 2,
        stackSkillId: null,
        stackName: null,
      },
    };
    api.get
      .mockResolvedValueOnce(expired)
      .mockResolvedValueOnce({ ...base, nextStep: 'test' });
    const signal = new AbortController().signal;
    expect(await loadCandidateOnboarding(signal)).toEqual({
      ...base,
      nextStep: 'test',
    });
    expect(api.attempt).toHaveBeenCalledWith('attempt', signal);
    expect(api.get).toHaveBeenCalledTimes(2);
  });
  it('never fetches hidden attempt data after consent revocation', async () => {
    api.get.mockResolvedValue({ ...base, nextStep: 'consent' });
    await loadCandidateOnboarding(new AbortController().signal);
    expect(api.attempt).not.toHaveBeenCalled();
  });
});
