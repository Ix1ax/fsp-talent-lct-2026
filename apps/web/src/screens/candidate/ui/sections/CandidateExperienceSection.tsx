import {
  CandidateExperienceCard,
  ResumeCareerDrafts,
} from '@/features/candidate';

import type { CandidateWorkspace } from '../../model';

interface CandidateExperienceSectionProps {
  workspace: CandidateWorkspace;
}

export const CandidateExperienceSection = ({
  workspace,
}: CandidateExperienceSectionProps) => {
  const {
    fullProfile,
    profile,
    busy,
    setBusy,
    refreshAfterSave,
    changeStep,
    importedResume,
    careerRevision,
    step,
    handleImportedRecordSaved,
    setExperienceCount,
  } = workspace;

  if (!fullProfile) return null;

  return (
    <>
      {importedResume && (
        <ResumeCareerDrafts
          key={importedResume.id}
          resume={importedResume}
          kind="experience"
          profileId={profile?.id}
          active={step === 'experience'}
          revision={careerRevision}
          busy={busy}
          onBusyChange={setBusy}
          onSaved={handleImportedRecordSaved}
        />
      )}
      <CandidateExperienceCard
        revision={careerRevision}
        profileId={profile?.id}
        active={step === 'experience'}
        busy={busy}
        onBusyChange={setBusy}
        onSaved={refreshAfterSave}
        onCountChange={setExperienceCount}
        onGoToProfile={() => changeStep('profile')}
      />
    </>
  );
};
