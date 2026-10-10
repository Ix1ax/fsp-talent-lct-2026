import { CandidatePDFButton } from '@/features/candidate/resume-export';

import type { CandidateWorkspace } from '../../model';
import { ProfileReadinessCard } from '../steps';

interface CandidateReadinessSectionProps {
  workspace: CandidateWorkspace;
}

export const CandidateReadinessSection = ({
  workspace,
}: CandidateReadinessSectionProps) => {
  const {
    fullProfile,
    busy,
    refreshFullProfile,
    changeStep,
    dataRefreshing,
    refreshError,
    navigateFromReadiness,
  } = workspace;

  if (!fullProfile) return null;

  return (
    <div className="grid gap-5">
      <ProfileReadinessCard
        readiness={fullProfile.readiness}
        searchStatus={fullProfile.profile?.searchStatus}
        busy={busy}
        refreshing={dataRefreshing}
        error={refreshError}
        onRefresh={() => void refreshFullProfile().catch(() => {})}
        onGoToProfile={() => changeStep('profile')}
        onGoToConsents={() => changeStep('consents')}
        onSelectItem={navigateFromReadiness}
      />
      <CandidatePDFButton
        profileExists={!!workspace.profile}
        processing={workspace.permissions.processing}
        disabled={busy || dataRefreshing}
      />
    </div>
  );
};
