import { describe, expect, it } from 'vitest';

import type {
  CandidateConsent,
  CandidateFullProfile,
} from '@/entities/candidate';

import { applyConsentRevocation } from '../applyConsentRevocation';
import { reconcileConsents } from '../reconcileConsents';

const consent = (
  kind: CandidateConsent['kind'],
  companyId: string | null = null,
): CandidateConsent => ({
  id: `${kind}-${companyId}`,
  kind,
  companyId,
  policyVersion: 'v1',
  grantedAt: 'now',
  revokedAt: null,
});

const fullProfile: CandidateFullProfile = {
  profile: {
    id: 'profile',
    avatarFileId: null,
    headline: 'Developer',
    summary: null,
    city: null,
    timezone: null,
    experienceMonths: 16,
    salaryMinRub: null,
    searchStatus: 'open',
    workFormatIds: [],
    updatedAt: 'now',
  },
  contacts: {
    fullName: 'Иван',
    email: 'user@example.com',
    phone: '',
    telegram: '',
    updatedAt: 'now',
  },
  consents: {
    currentPolicyVersion: 'v1',
    items: [
      consent('processing'),
      consent('publication'),
      consent('ats_transfer', 'company'),
      consent('ats_transfer', 'other'),
    ],
  },
  skills: [],
  category: null,
  achievements: [],
  readiness: { percent: 100, readyToPublish: true, items: [] },
};

describe('consent revocation effects', () => {
  it('closes contacts when the history response is newer than the full profile response', () => {
    const consents = {
      ...fullProfile.consents,
      items: fullProfile.consents.items.map((item) => ({
        ...item,
        revokedAt: 'revoked',
      })),
    };
    const result = reconcileConsents(fullProfile, consents);
    expect(result.contacts).toBeNull();
    expect(result.profile?.searchStatus).toBe('hidden');
    expect(result.consents).toEqual(consents);
  });
  it('does not restore publication when both consents are regranted', () => {
    const hidden = {
      ...fullProfile,
      profile: fullProfile.profile && {
        ...fullProfile.profile,
        searchStatus: 'hidden' as const,
      },
    };
    expect(
      reconcileConsents(hidden, fullProfile.consents).profile?.searchStatus,
    ).toBe('hidden');
  });
  it('immediately closes contacts, hides the profile and revokes all consents after processing withdrawal', () => {
    const result = applyConsentRevocation(fullProfile, { kind: 'processing' });
    expect(result.contacts).toBeNull();
    expect(result.consents.items).toEqual([]);
    expect(result.profile).toEqual({
      ...fullProfile.profile,
      searchStatus: 'hidden',
    });
    expect(result.readiness.readyToPublish).toBe(false);
    expect(fullProfile.profile?.searchStatus).toBe('open');
  });
  it('hides the profile without removing processing or contacts after publication withdrawal', () => {
    const result = applyConsentRevocation(fullProfile, { kind: 'publication' });
    expect(result.profile?.searchStatus).toBe('hidden');
    expect(result.contacts).toEqual(fullProfile.contacts);
    expect(result.consents.items.map((item) => item.kind)).toEqual([
      'processing',
      'ats_transfer',
      'ats_transfer',
    ]);
  });
  it('removes transfer consent only for the selected company', () => {
    const result = applyConsentRevocation(fullProfile, {
      kind: 'ats_transfer',
      companyId: 'company',
    });
    expect(result.profile).toEqual(fullProfile.profile);
    expect(result.contacts).toEqual(fullProfile.contacts);
    expect(
      result.consents.items.some((item) => item.companyId === 'company'),
    ).toBe(false);
    expect(
      result.consents.items.some((item) => item.companyId === 'other'),
    ).toBe(true);
  });
});
