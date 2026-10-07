import type { CandidateConsents, ConsentKind } from './types';

export const hasActiveConsent = (
  consents: CandidateConsents,
  kind: ConsentKind,
  companyId?: string,
): boolean => {
  return consents.items.some(
    (consent) =>
      consent.kind === kind &&
      consent.revokedAt === null &&
      (kind !== 'ats_transfer' || consent.companyId === companyId),
  );
};

export const getConsentPermissions = (consents: CandidateConsents) => {
  const processing = hasActiveConsent(consents, 'processing');
  const publication = hasActiveConsent(consents, 'publication');

  return { processing, publication, canPublish: processing && publication };
};
