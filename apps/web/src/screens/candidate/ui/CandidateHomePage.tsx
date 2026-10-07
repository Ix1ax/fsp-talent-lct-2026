'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';
import type {
  CandidateFullProfile,
  CandidateProfile,
} from '@/entities/candidate-profile';
import type { CatalogItem } from '@/entities/catalog';
import type { SessionUser } from '@/entities/session';
import { CandidateAvatar } from '@/features/candidate-avatar';
import { CandidateProfileForm } from '@/features/candidate-profile';

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
  const [fullProfile, setFullProfile] = useState(initialFullProfile);
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();

  const profile = fullProfile?.profile ?? undefined;

  const setProfile = (next: CandidateProfile | undefined) => {
    setFullProfile(
      (current) => current && { ...current, profile: next ?? null },
    );
  };

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
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
        <>
          {busy && (
            <p role="status" className="text-sm text-muted-foreground">
              Сохранение изменений…
            </p>
          )}
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
                onBusyChange={setBusy}
                onProfileChange={setProfile}
              />
              <CandidateProfileForm
                profile={profile}
                workFormats={workFormats}
                busy={busy}
                onBusyChange={setBusy}
                onProfileChange={setProfile}
              />
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
};
