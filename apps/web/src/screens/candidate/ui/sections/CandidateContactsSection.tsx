import { CandidateContactsCard } from '@/features/candidate';

import type { CandidateWorkspace } from '../../model';

interface CandidateContactsSectionProps {
  workspace: CandidateWorkspace;
}

export const CandidateContactsSection = ({
  workspace,
}: CandidateContactsSectionProps) => {
  const {
    fullProfile,
    busy,
    handleFormBusyChange,
    refreshFullProfile,
    updateFullProfile,
    changeStep,
    importedResume,
    registerContactsDraftReader,
    user,
  } = workspace;

  if (!fullProfile) return null;

  return (
    <CandidateContactsCard
      importedDraft={importedResume?.contacts}
      onDraftReader={registerContactsDraftReader}
      contacts={fullProfile.contacts}
      consents={fullProfile.consents}
      defaultName={user.name}
      defaultEmail={user.email}
      busy={busy}
      onBusyChange={handleFormBusyChange}
      onConsentRequired={refreshFullProfile}
      onGoToConsents={() => changeStep('consents')}
      onSaved={() => changeStep('experience')}
      onContactsChange={(contacts) => {
        updateFullProfile((current) => ({ ...current, contacts }));
      }}
    />
  );
};
