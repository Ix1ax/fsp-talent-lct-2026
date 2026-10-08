import {
  CandidateEducationCard,
  ResumeCareerDrafts,
} from '@/features/candidate';

import type { CandidateWorkspace } from '../../model';

interface CandidateEducationSectionProps {
  workspace: CandidateWorkspace;
}

export const CandidateEducationSection = ({
  workspace,
}: CandidateEducationSectionProps) => {
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
    setEducationCount,
  } = workspace;

  if (!fullProfile) return null;

  return (
    <>
      {importedResume && (
        <ResumeCareerDrafts
          key={importedResume.id}
          resume={importedResume}
          kind="education"
          profileId={profile?.id}
          active={step === 'education'}
          revision={careerRevision}
          busy={busy}
          onBusyChange={setBusy}
          onSaved={handleImportedRecordSaved}
        />
      )}
      <CandidateEducationCard
        revision={careerRevision}
        profileId={profile?.id}
        active={step === 'education'}
        busy={busy}
        onBusyChange={setBusy}
        onSaved={refreshAfterSave}
        onCountChange={setEducationCount}
        onGoToProfile={() => changeStep('profile')}
      />
    </>
  );
};
