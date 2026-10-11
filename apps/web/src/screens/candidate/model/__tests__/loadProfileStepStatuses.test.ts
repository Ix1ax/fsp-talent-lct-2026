import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadProfileStepStatuses } from '../loadProfileStepStatuses';

const mocks = vi.hoisted(() => ({
  profile: vi.fn(),
  experience: vi.fn(),
  education: vi.fn(),
}));
vi.mock('@/shared/api', () => ({ ensureClientAccessToken: vi.fn() }));
vi.mock('@/entities/candidate/profile', () => ({
  getCandidateFullProfileClient: mocks.profile,
}));
vi.mock('@/entities/candidate/experience', () => ({
  getCandidateExperiences: mocks.experience,
}));
vi.mock('@/entities/candidate/education', () => ({
  getCandidateEducations: mocks.education,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.profile.mockResolvedValue({
    profile: { id: 'profile' },
    contacts: null,
    skills: [],
    consents: { currentPolicyVersion: 'v1', items: [] },
    readiness: { readyToPublish: false },
  });
  mocks.experience.mockResolvedValue({ items: [{ id: 'experience' }] });
  mocks.education.mockResolvedValue({ items: [{ id: 'education' }] });
});

describe('profile section statuses', () => {
  it('keeps other statuses when the experience endpoint fails', async () => {
    mocks.experience.mockRejectedValue(new Error('unavailable'));
    expect(await loadProfileStepStatuses(new AbortController().signal)).toEqual(
      {
        savedSteps: ['profile', 'education'],
        unavailableSteps: ['experience'],
      },
    );
  });
  it('keeps other statuses when the education endpoint fails', async () => {
    mocks.education.mockRejectedValue(new Error('unavailable'));
    expect(await loadProfileStepStatuses(new AbortController().signal)).toEqual(
      {
        savedSteps: ['profile', 'experience'],
        unavailableSteps: ['education'],
      },
    );
  });
  it('does not request career records before a profile exists', async () => {
    mocks.profile.mockResolvedValue({
      profile: null,
      contacts: null,
      skills: [],
      consents: { items: [] },
      readiness: { readyToPublish: false },
    });
    expect(await loadProfileStepStatuses(new AbortController().signal)).toEqual(
      { savedSteps: [], unavailableSteps: [] },
    );
    expect(mocks.experience).not.toHaveBeenCalled();
    expect(mocks.education).not.toHaveBeenCalled();
  });
});
