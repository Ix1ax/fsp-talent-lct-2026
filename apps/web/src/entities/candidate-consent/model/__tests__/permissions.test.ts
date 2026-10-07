import { describe, expect, it } from 'vitest';

import { getConsentPermissions, hasActiveConsent } from '../permissions';
import type { CandidateConsent, CandidateConsents } from '../types';

const consent = (
  kind: CandidateConsent['kind'],
  revokedAt: string | null = null,
): CandidateConsent => ({
  id: kind,
  kind,
  policyVersion: 'v1',
  companyId: null,
  grantedAt: 'now',
  revokedAt,
});
const consents = (items: CandidateConsent[]): CandidateConsents => ({
  currentPolicyVersion: 'v2',
  items,
});

describe('consent permissions', () => {
  it('requires both active consents for publication', () => {
    expect(getConsentPermissions(consents([consent('processing')]))).toEqual({
      processing: true,
      publication: false,
      canPublish: false,
    });
    expect(
      getConsentPermissions(
        consents([consent('processing'), consent('publication')]),
      ).canPublish,
    ).toBe(true);
  });
  it('does not count revoked entries or transfer consents as processing', () => {
    expect(
      getConsentPermissions(
        consents([
          consent('processing', 'revoked'),
          consent('publication'),
          consent('ats_transfer'),
        ]),
      ).canPublish,
    ).toBe(false);
  });
  it('matches transfer consent to its company', () => {
    const state = consents([
      { ...consent('ats_transfer'), companyId: 'company' },
    ]);
    expect(hasActiveConsent(state, 'ats_transfer', 'company')).toBe(true);
    expect(hasActiveConsent(state, 'ats_transfer', 'other')).toBe(false);
  });
});
