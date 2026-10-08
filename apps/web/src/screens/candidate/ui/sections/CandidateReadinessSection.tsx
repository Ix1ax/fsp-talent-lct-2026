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
    <ProfileReadinessCard
      readiness={fullProfile.readiness}
      busy={busy}
      refreshing={dataRefreshing}
      error={refreshError}
      onRefresh={() => void refreshFullProfile().catch(() => {})}
      onGoToProfile={() => changeStep('profile')}
      onGoToConsents={() => changeStep('consents')}
      onSelectItem={navigateFromReadiness}
    />
  );
};
