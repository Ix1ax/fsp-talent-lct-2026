import { describe, expect, it } from 'vitest';

import type { CandidateConsent, CandidateConsents } from '@/entities/candidate';

import { getProfileConsentError } from '../getProfileConsentError';

const consents = (...kinds: CandidateConsent['kind'][]): CandidateConsents => ({
  currentPolicyVersion: 'v1',
  items: kinds.map((kind) => ({
    id: kind,
    kind,
    policyVersion: 'v1',
    companyId: null,
    grantedAt: 'now',
    revokedAt: null,
  })),
});

describe('profile consent restrictions', () => {
  it('requires processing even for a new hidden profile', () => {
    expect(getProfileConsentError(consents(), false, 'hidden')).toContain(
      'создания',
    );
    expect(
      getProfileConsentError(consents('processing'), false, 'hidden'),
    ).toBe('');
  });
  it('allows editing an existing hidden profile without processing', () => {
    expect(getProfileConsentError(consents(), true, 'hidden')).toBe('');
  });
  it.each(['open', 'passive'] as const)(
    'requires both consents for %s',
    (status) => {
      expect(
        getProfileConsentError(consents('processing'), true, status),
      ).toContain('публикации');
      expect(
        getProfileConsentError(
          consents('processing', 'publication'),
          true,
          status,
        ),
      ).toBe('');
    },
  );
});
