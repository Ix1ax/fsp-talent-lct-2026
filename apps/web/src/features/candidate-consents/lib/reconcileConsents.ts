import {
  type CandidateConsents,
  getConsentPermissions,
} from '@/entities/candidate-consent';
import type { CandidateFullProfile } from '@/entities/candidate-profile';

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
