import { describe, expect, it } from 'vitest';

import type { CandidateFullProfile } from '@/entities/candidate';

import { getSavedProfileSteps } from '../getSavedProfileSteps';

const profile: CandidateFullProfile = {
  profile: null,
  contacts: null,
  skills: [],
  category: null,
  achievements: [],
  consents: {
    currentPolicyVersion: 'v1',
    items: [
      {
        id: 'processing',
        kind: 'processing',
        policyVersion: 'v1',
        companyId: null,
        grantedAt: '',
        revokedAt: null,
      },
    ],
  },
  readiness: { percent: 20, readyToPublish: false, items: [] },
};

describe('saved profile steps', () => {
  it('recognizes processing consent without requiring voluntary publication', () => {
    expect(getSavedProfileSteps(profile)).toEqual(['consents']);
  });
  it('ignores stale record counts when the candidate profile no longer exists', () => {
    expect(getSavedProfileSteps(profile, 2, 1)).toEqual(['consents']);
  });
  it('tracks education separately from experience without changing server readiness', () => {
    const full: CandidateFullProfile = {
      ...profile,
      profile: {
        id: 'profile',
        avatarFileId: null,
        headline: null,
        summary: null,
        city: null,
        timezone: null,
        experienceMonths: 0,
        salaryMinRub: null,
        searchStatus: 'hidden',
        workFormatIds: [],
        updatedAt: '',
      },
    };
    expect(getSavedProfileSteps(full, 0, 1)).toEqual([
      'consents',
      'profile',
      'education',
    ]);
    expect(full.readiness.readyToPublish).toBe(false);
    expect(full.readiness.percent).toBe(20);
  });
  it('does not mark revoked processing or publication alone as a saved consent step', () => {
    const processing = profile.consents.items[0];
    expect(
      getSavedProfileSteps({
        ...profile,
        consents: {
          ...profile.consents,
          items: [
            { ...processing, revokedAt: 'now' },
            { ...processing, id: 'publication', kind: 'publication' },
          ],
        },
      }),
    ).toEqual([]);
  });
});
