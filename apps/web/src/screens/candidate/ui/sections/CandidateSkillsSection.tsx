import Link from 'next/link';

import { DYNAMIC_ROUTES } from '@/shared/contants';
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Подтвердите навыки с помощью тестов.
        </p>
        <Button asChild variant="outline" size="lg">
          <Link href={DYNAMIC_ROUTES.CANDIDATE('assessments')}>
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
