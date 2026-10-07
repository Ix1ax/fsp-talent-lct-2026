import type { RevokeConsentInput } from '@/entities/candidate-consent';
import type { CandidateFullProfile } from '@/entities/candidate-profile';

export const applyConsentRevocation = (
  fullProfile: CandidateFullProfile,
  input: RevokeConsentInput,
): CandidateFullProfile => {
  const hidesProfile = input.kind !== 'ats_transfer';

  return {
    ...fullProfile,
    consents: {
      ...fullProfile.consents,
      items: fullProfile.consents.items.filter((consent) => {
        if (consent.revokedAt !== null) return true;
        if (input.kind === 'processing') return false;
        if (consent.kind !== input.kind) return true;
        return (
          input.kind === 'ats_transfer' && consent.companyId !== input.companyId
        );
      }),
    },
    contacts: input.kind === 'processing' ? null : fullProfile.contacts,
    profile:
      hidesProfile && fullProfile.profile
        ? { ...fullProfile.profile, searchStatus: 'hidden' }
        : fullProfile.profile,
    readiness: hidesProfile
      ? { ...fullProfile.readiness, readyToPublish: false }
      : fullProfile.readiness,
  };
};
