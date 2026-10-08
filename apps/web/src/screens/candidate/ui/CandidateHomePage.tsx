'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
} from '@/shared/ui';
import {
  type CandidateFullProfile,
  type CandidateProfile,
  getConsentPermissions,
} from '@/entities/candidate';
import type { CatalogItem } from '@/entities/catalog';
import type { SessionUser } from '@/entities/session';
import {
  type AppliedResume,
  applyConsentRevocation,
  CandidateAvatar,
  CandidateConsentsCard,
  CandidateContactsCard,
  CandidateEducationCard,
  CandidateExperienceCard,
  CandidateProfileForm,
  CandidateSkillsCard,
  reconcileConsents,
  ResumeCareerDrafts,
  ResumeImportCard,
  ResumeSkillDrafts,
  toContactsFormValues,
  toProfileFormValues,
} from '@/features/candidate';

import { PROFILE_STEPS, type ProfileStep } from '../constants';
import { getSavedProfileSteps, useCandidateFullProfile } from '../model';
import {
  ProfileReadinessCard,
  ProfileStepActions,
  ProfileStepNavigation,
} from './steps';

interface CandidateHomePageProps {
  user: SessionUser;
  initialFullProfile?: CandidateFullProfile;
  workFormats?: CatalogItem[];
  loadError?: string;
}
export const CandidateHomePage = ({
  user,
  initialFullProfile,
  workFormats,
  loadError,
}: CandidateHomePageProps) => {
  const router = useRouter();
  const {
    fullProfile,
    updateFullProfile,
    refreshFullProfile,
    refreshAfterSave,
    refreshing: dataRefreshing,
    refreshError,
  } = useCandidateFullProfile(initialFullProfile);
  const [busy, setBusy] = useState(false);
  const [experienceCount, setExperienceCount] = useState(0);
  const [educationCount, setEducationCount] = useState(0);
  const [step, setStep] = useState<ProfileStep>('consents');
  const [refreshing, startTransition] = useTransition();
  const navigationRef = useRef<HTMLDivElement>(null);
  const [importedResume, setImportedResume] = useState<AppliedResume>();
  const [careerRevision, setCareerRevision] = useState(0);
  const profileDraftReader = useRef<
    (() => Record<string, unknown>) | undefined
  >(undefined);
  const contactsDraftReader = useRef<
    (() => Record<string, unknown>) | undefined
  >(undefined);

  const profile = fullProfile?.profile ?? undefined;
  const permissions = fullProfile
    ? getConsentPermissions(fullProfile.consents)
    : { processing: false, canPublish: false };

  const setProfile = (next: CandidateProfile | undefined) => {
    updateFullProfile((current) => ({ ...current, profile: next ?? null }));
  };
  const handleFormBusyChange = (next: boolean) => {
    setBusy(next);
    if (!next) refreshAfterSave();
  };
  const changeStep = (next: ProfileStep) => {
    if (busy) return;
    setStep(next);
    navigationRef.current?.scrollIntoView({ block: 'start' });
  };
  const handleImportedRecordSaved = () => {
    setCareerRevision((current) => current + 1);
    refreshAfterSave();
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Кабинет кандидата</h1>
        <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
          {user.email}
        </p>
        <p className="text-base text-muted-foreground">
          Расскажите об опыте и условиях работы. Публикацией профиля управляете
          вы.
        </p>
      </header>
      {!loadError && fullProfile && (
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
          getCurrentDraft={() => ({
            profile:
              profileDraftReader.current?.() ?? toProfileFormValues(profile),
            contacts:
              contactsDraftReader.current?.() ??
              toContactsFormValues(fullProfile.contacts, {
                name: user.name,
                email: user.email,
              }),
          })}
          onApply={(resume) => {
            setImportedResume(resume);
            changeStep('profile');
          }}
        />
      )}
      {loadError ? (
        <Card>
          <CardHeader>
            <CardTitle>Профиль недоступен</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p role="alert">{loadError}</p>
            <Button
              disabled={refreshing}
              onClick={() => startTransition(() => router.refresh())}
              className="self-start"
            >
              Повторить загрузку
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs
          value={step}
          onValueChange={(next) => {
            const found = PROFILE_STEPS.find((item) => item.id === next);
            if (found) changeStep(found.id);
          }}
          className="flex-1 gap-6"
        >
          <div ref={navigationRef} className="scroll-mt-4">
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
          <p role="status" className="sr-only">
            {busy ? 'Сохранение изменений…' : ''}
          </p>
          {fullProfile && (
            <TabsContent
              value="consents"
              forceMount
              className="data-[state=inactive]:hidden"
            >
              <CandidateConsentsCard
                consents={fullProfile.consents}
                busy={busy}
                onBusyChange={setBusy}
                onConsentsChange={(consents) => {
                  updateFullProfile((current) =>
                    reconcileConsents(current, consents),
                  );
                  refreshAfterSave();
                }}
                onRevoked={(input) =>
                  updateFullProfile((current) =>
                    applyConsentRevocation(current, input),
                  )
                }
                onRefreshProfile={refreshFullProfile}
              />
            </TabsContent>
          )}
          <TabsContent
            value="profile"
            forceMount
            className="data-[state=inactive]:hidden"
          >
            <Card>
              <CardHeader>
                <CardTitle>
                  {profile ? 'Настройка профиля' : 'Создание профиля'}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                {fullProfile && (
                  <CandidateProfileForm
                    importedDraft={importedResume?.profile}
                    onDraftReader={(reader) => {
                      profileDraftReader.current = reader;
                    }}
                    profile={profile}
                    workFormats={workFormats}
                    consents={fullProfile.consents}
                    onConsentRequired={refreshFullProfile}
                    busy={busy}
                    onBusyChange={handleFormBusyChange}
                    onProfileChange={setProfile}
                    onSaved={() => changeStep('contacts')}
                  />
                )}
                <div className="border-t border-border pt-5">
                  <CandidateAvatar
                    profile={profile}
                    busy={busy}
                    onBusyChange={handleFormBusyChange}
                    onProfileChange={setProfile}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {fullProfile && (
            <TabsContent
              value="contacts"
              forceMount
              className="data-[state=inactive]:hidden"
            >
              <CandidateContactsCard
                importedDraft={importedResume?.contacts}
                onDraftReader={(reader) => {
                  contactsDraftReader.current = reader;
                }}
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
            </TabsContent>
          )}
          {fullProfile && (
            <>
              <TabsContent
                value="experience"
                forceMount
                className="data-[state=inactive]:hidden"
              >
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
              </TabsContent>
              <TabsContent
                value="education"
                forceMount
                className="data-[state=inactive]:hidden"
              >
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
              </TabsContent>
              <TabsContent
                value="skills"
                forceMount
                className="data-[state=inactive]:hidden"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Подтвердите навыки с помощью тестов.
                  </p>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/candidate/assessments">
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
              </TabsContent>
              <TabsContent
                value="readiness"
                forceMount
                className="data-[state=inactive]:hidden"
              >
                <ProfileReadinessCard
                  readiness={fullProfile.readiness}
                  busy={busy}
                  refreshing={dataRefreshing}
                  error={refreshError}
                  onRefresh={() => void refreshFullProfile().catch(() => {})}
                  onGoToProfile={() => changeStep('profile')}
                  onGoToConsents={() => changeStep('consents')}
                />
              </TabsContent>
            </>
          )}
          {refreshError && step !== 'readiness' && (
            <div className="flex flex-col gap-2">
              <p role="alert" className="text-sm text-destructive">
                {refreshError}
              </p>
              <Button
                variant="outline"
                disabled={busy || dataRefreshing}
                onClick={() => void refreshFullProfile().catch(() => {})}
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
        </Tabs>
      )}
    </main>
  );
};
