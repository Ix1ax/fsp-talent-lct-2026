import Link from 'next/link';
import { ClipboardCheckIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button } from '@/shared/ui';
import { CandidateSkillsCard, ResumeSkillDrafts } from '@/features/candidate';

import type { CandidateWorkspace } from '../../model';

interface CandidateSkillsSectionProps {
  workspace: CandidateWorkspace;
}

export const CandidateSkillsSection = ({
  workspace,
}: CandidateSkillsSectionProps) => {
  const {
    fullProfile,
    profile,
    permissions,
    busy,
    setBusy,
    handleFormBusyChange,
    refreshAfterSave,
    updateFullProfile,
    importedResume,
  } = workspace;
  if (!fullProfile) return null;
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-primary/15 bg-accent/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <ClipboardCheckIcon
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-brand-text"
          />
          <p className="text-sm">
            Подтвердите уровень навыков тестированием: работодатели видят
            подтверждённый уровень.
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link href={STATIC_ROUTES.CANDIDATE_ASSESSMENTS}>
            Тестирование навыков
          </Link>
        </Button>
      </div>
      {importedResume && (
        <ResumeSkillDrafts
          key={importedResume.id}
          resume={importedResume}
          profileExists={!!profile}
          processing={permissions.processing}
          skills={fullProfile.skills}
          busy={busy}
          onBusyChange={setBusy}
          onSaved={refreshAfterSave}
          onSkillsChange={(skills) =>
            updateFullProfile((current) => ({ ...current, skills }))
          }
        />
      )}
      <CandidateSkillsCard
        skills={fullProfile.skills}
        profileExists={!!profile}
        busy={busy}
        onBusyChange={handleFormBusyChange}
        onSkillsChange={(skills) =>
          updateFullProfile((current) => ({ ...current, skills }))
        }
      />
    </>
  );
};
