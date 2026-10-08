'use client';

import { usePathname } from 'next/navigation';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button } from '@/shared/ui';
import type { CandidateFullProfile } from '@/entities/candidate';
import type { CatalogItem } from '@/entities/catalog';
import type { SessionUser } from '@/entities/session';

import { getSavedProfileSteps, useCandidateWorkspace } from '../model';
import { CandidateProfileLoadError } from './CandidateProfileLoadError';
import { CandidateProfileSections } from './CandidateProfileSections';
import { CandidateResumeImport } from './CandidateResumeImport';
import { ProfileStepActions, ProfileStepNavigation } from './steps';

interface CandidateHomePageProps {
  user: SessionUser;
  initialFullProfile?: CandidateFullProfile;
  workFormats?: CatalogItem[];
  loadError?: string;
}

export const CandidateHomePage = ({
  loadError,
  ...options
}: CandidateHomePageProps) => {
  const workspace = useCandidateWorkspace(options);
  const pathname = usePathname();

  const {
    user,
    fullProfile,
    step,
    busy,
    permissions,
    profile,
    experienceCount,
    educationCount,
    navigationRef,
    profileContainerRef,
    sectionContentRef,
    changeStep,
    refreshError,
    dataRefreshing,
    refreshAfterSave,
  } = workspace;

  return (
    <main
      ref={profileContainerRef}
      hidden={pathname === STATIC_ROUTES.CANDIDATE}
      className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 [overflow-anchor:none] sm:px-6 sm:py-10"
    >
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Мой профиль</h1>
          <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {user.email}
          </p>
          <p className="text-base text-muted-foreground">
            Расскажите об опыте и условиях работы. Публикацией профиля
            управляете вы.
          </p>
        </header>
        {loadError ? (
          <CandidateProfileLoadError error={loadError} />
        ) : (
          <>
            <CandidateResumeImport workspace={workspace} />
            <div className="grid items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
              <div
                ref={navigationRef}
                className="scroll-mt-24 lg:sticky lg:top-24"
              >
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
              <div
                ref={sectionContentRef}
                className="grid min-w-0 scroll-mt-24 gap-5"
              >
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
          </>
        )}
      </div>
    </main>
  );
};
