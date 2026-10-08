import { ResumeImportCard } from '@/features/candidate';

import type { CandidateWorkspace } from '../model';
interface CandidateResumeImportProps {
  workspace: CandidateWorkspace;
}
export const CandidateResumeImport = ({
  workspace,
}: CandidateResumeImportProps) => {
  const {
    fullProfile,
    profile,
    permissions,
    workFormats,
    busy,
    importedResume,
    setBusy,
    refreshFullProfile,
    changeStep,
    getCurrentDraft,
    applyResume,
  } = workspace;

  if (!fullProfile) return null;

  return (
    <details className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <summary className="cursor-pointer text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
        Заполнить профиль из резюме
        <span className="mt-1 block text-sm font-normal text-muted-foreground">
          Загрузите файл, чтобы перенести опыт, образование и навыки.
        </span>
      </summary>
      <div className="mt-4">
        <ResumeImportCard
          processing={permissions.processing}
          profileId={profile?.id}
          skills={fullProfile.skills}
          workFormats={workFormats}
          busy={busy}
          applied={importedResume}
          onBusyChange={setBusy}
          onConsentRequired={refreshFullProfile}
          onGoToConsents={() => changeStep('consents')}
          getCurrentDraft={getCurrentDraft}
          onApply={applyResume}
        />
      </div>
    </details>
  );
};
