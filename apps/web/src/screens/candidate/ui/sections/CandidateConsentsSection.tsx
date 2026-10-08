import {
  applyConsentRevocation,
  CandidateConsentsCard,
  reconcileConsents,
} from '@/features/candidate';

import type { CandidateWorkspace } from '../../model';

interface CandidateConsentsSectionProps {
  workspace: CandidateWorkspace;
}

export const CandidateConsentsSection = ({
  workspace,
}: CandidateConsentsSectionProps) => {
  const {
    fullProfile,
    busy,
    setBusy,
    refreshFullProfile,
    refreshAfterSave,
    updateFullProfile,
  } = workspace;

  if (!fullProfile) return null;

  return (
    <CandidateConsentsCard
      consents={fullProfile.consents}
      busy={busy}
      onBusyChange={setBusy}
      onConsentsChange={(consents) => {
        updateFullProfile((current) => reconcileConsents(current, consents));
        refreshAfterSave();
      }}
      onRevoked={(input) =>
        updateFullProfile((current) => applyConsentRevocation(current, input))
      }
      onRefreshProfile={refreshFullProfile}
    />
  );
};
