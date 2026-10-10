import { Button } from '@/shared/ui';

import { type CandidateWorkspace, getSavedProfileSteps } from '../model';
import { CandidateProfileSections } from './CandidateProfileSections';
import { ProfileStepActions, ProfileStepNavigation } from './steps';

interface CandidateProfileEditorProps {
  workspace: CandidateWorkspace;
}

export const CandidateProfileEditor = ({
  workspace,
}: CandidateProfileEditorProps) => {
  const {
    fullProfile,
    step,
    busy,
    permissions,
    profile,
    experienceCount,
    educationCount,
    navigationRef,
    sectionContentRef,
    changeStep,
    refreshError,
    dataRefreshing,
    refreshAfterSave,
  } = workspace;
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
      <div ref={navigationRef} className="scroll-mt-24 lg:sticky lg:top-24">
        <ProfileStepNavigation
          step={step}
          busy={busy}
          savedSteps={getSavedProfileSteps(
            fullProfile,
            experienceCount,
            educationCount,
          )}
          onStepChange={changeStep}
        />
      </div>
      <div ref={sectionContentRef} className="grid min-w-0 scroll-mt-24 gap-5">
        <p role="status" className="sr-only">
          {busy ? 'Сохранение изменений…' : ''}
        </p>
        <CandidateProfileSections workspace={workspace} />
        {refreshError && step !== 'readiness' && (
          <div className="flex flex-col gap-2">
            <p role="alert" className="text-sm text-destructive">
              {refreshError}
            </p>
            <Button
              variant="outline"
              disabled={busy || dataRefreshing}
              onClick={refreshAfterSave}
              className="self-start"
            >
              Повторить обновление
            </Button>
          </div>
        )}
        <ProfileStepActions
          step={step}
          busy={busy}
          processing={permissions.processing}
          profileExists={!!profile}
          onStepChange={changeStep}
        />
      </div>
    </div>
  );
};
