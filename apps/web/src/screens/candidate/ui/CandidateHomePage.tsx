'use client';

import { useState, useTransition } from 'react';
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
import type {
  CandidateFullProfile,
  CandidateProfile,
} from '@/entities/candidate-profile';
import type { CatalogItem } from '@/entities/catalog';
import type { SessionUser } from '@/entities/session';
import { CandidateAvatar } from '@/features/candidate-avatar';
import {
  applyConsentRevocation,
  CandidateConsentsCard,
  reconcileConsents,
} from '@/features/candidate-consents';
import { CandidateContactsCard } from '@/features/candidate-contacts';
import { CandidateProfileForm } from '@/features/candidate-profile';
import { CandidateSkillsCard } from '@/features/candidate-skills';

import { PROFILE_STEPS, type ProfileStep } from '../constants';
import { getSavedProfileSteps, useCandidateFullProfile } from '../model';
import { ProfileReadinessCard, ProfileStepNavigation } from './steps';

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
  const [step, setStep] = useState<ProfileStep>('consents');
  const [refreshing, startTransition] = useTransition();

  const profile = fullProfile?.profile ?? undefined;

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
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Кабинет кандидата</h1>
        <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
          {user.email}
        </p>
      </header>
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
          {busy && (
            <p role="status" className="text-sm text-muted-foreground">
              Сохранение изменений…
            </p>
          )}
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
                <CandidateAvatar
                  profile={profile}
                  busy={busy}
                  onBusyChange={handleFormBusyChange}
                  onProfileChange={setProfile}
                />
                {fullProfile && (
                  <CandidateProfileForm
                    profile={profile}
                    workFormats={workFormats}
                    consents={fullProfile.consents}
                    onConsentRequired={refreshFullProfile}
                    busy={busy}
                    onBusyChange={handleFormBusyChange}
                    onProfileChange={setProfile}
                  />
                )}
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
                contacts={fullProfile.contacts}
                consents={fullProfile.consents}
                defaultName={user.name}
                defaultEmail={user.email}
                busy={busy}
                onBusyChange={handleFormBusyChange}
                onConsentRequired={refreshFullProfile}
                onGoToConsents={() => changeStep('consents')}
                onContactsChange={(contacts) => {
                  updateFullProfile((current) => ({ ...current, contacts }));
                }}
              />
            </TabsContent>
          )}
          {fullProfile && (
            <>
              <TabsContent
                value="skills"
                forceMount
                className="data-[state=inactive]:hidden"
              >
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
          <ProfileStepNavigation
            step={step}
            busy={busy}
            savedSteps={getSavedProfileSteps(fullProfile)}
          />
        </Tabs>
      )}
    </main>
  );
};
