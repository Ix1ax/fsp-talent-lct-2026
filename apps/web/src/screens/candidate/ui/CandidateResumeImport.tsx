import { ChevronDownIcon, FileTextIcon } from 'lucide-react';

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
    <details className="group rounded-xl border border-border bg-card">
      {/* Строка-заголовок: иконка, текст и шеврон по центру, без пустоты на телефоне. */}
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-xl p-4 focus-visible:outline-2 focus-visible:outline-ring sm:p-5 [&::-webkit-details-marker]:hidden">
        <FileTextIcon
          aria-hidden="true"
          className="size-5 shrink-0 text-muted-foreground"
        />
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-sm font-medium">
            Заполнить профиль из резюме
          </span>
          <span className="text-xs text-muted-foreground sm:text-sm">
            PDF с hh.ru — перенесём опыт, образование и навыки.
          </span>
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
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
