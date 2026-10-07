import {
  type CandidateConsents,
  type CandidateFullProfile,
  getConsentPermissions,
} from '@/entities/candidate';

import { applyConsentRevocation } from './applyConsentRevocation';

export const reconcileConsents = (
  fullProfile: CandidateFullProfile,
  consents: CandidateConsents,
): CandidateFullProfile => {
  const next = { ...fullProfile, consents };
  const { processing, publication } = getConsentPermissions(consents);
  if (!processing) return applyConsentRevocation(next, { kind: 'processing' });
  if (!publication)
    return applyConsentRevocation(next, { kind: 'publication' });
  return next;
};
