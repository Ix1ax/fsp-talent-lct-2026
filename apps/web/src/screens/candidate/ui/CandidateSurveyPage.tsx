'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { useRemoteData } from '@/shared/hooks';
import { Button, FadeIn, PageHeader, RemoteState } from '@/shared/ui';
import { getClientCatalogs } from '@/entities/catalog';
import {
  CandidateSurveyForm,
  loadCandidateOnboarding,
} from '@/features/candidate/onboarding';

const load = async (signal: AbortSignal) => {
  const [onboarding, catalogs] = await Promise.all([
    loadCandidateOnboarding(signal),
    getClientCatalogs(signal),
  ]);
  return { onboarding, catalogs };
};
export const CandidateSurveyPage = () => {
  const query = useRemoteData(load);
  const [saved, setSaved] = useState(false);
  const data = query.data;
  const blocked =
    data?.onboarding.nextStep === 'consent' ||
    data?.onboarding.nextStep === 'profile';
  return (
    <main className="container-page page-rhythm flex flex-1 flex-col gap-8">
      <PageHeader
        title="Направление и уровень"
        description="Выберите стек и оцените свой уровень. Эти данные помогут начать тестирование."
        actions={
          <Button asChild variant="outline">
            <Link href={STATIC_ROUTES.CANDIDATE}>
              <ArrowLeftIcon aria-hidden="true" />В кабинет
            </Link>
          </Button>
        }
      />
      <RemoteState
        loading={query.loading}
        error={query.error}
        retry={query.retry}
      />
      {data && blocked && (
        <FadeIn className="max-w-3xl space-y-4 rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            {data.onboarding.nextStep === 'consent'
              ? 'Для сохранения опроса нужно согласие на обработку данных.'
              : 'Сначала создайте профиль кандидата.'}
          </p>
          <Button asChild>
            <Link
              href={
                data.onboarding.nextStep === 'consent'
                  ? STATIC_ROUTES.CANDIDATE_CONSENTS
                  : STATIC_ROUTES.CANDIDATE_PROFILE
              }
            >
              {data.onboarding.nextStep === 'consent'
                ? 'Настроить согласия'
                : 'Заполнить профиль'}
            </Link>
          </Button>
        </FadeIn>
      )}
      {data && !blocked && (
        <FadeIn className="max-w-3xl rounded-xl border bg-card p-5 sm:p-7">
          <CandidateSurveyForm
            survey={data.onboarding.survey}
            catalogs={data.catalogs}
            stackName={
              data.onboarding.latestAttempt?.stackSkillId ===
              data.onboarding.survey?.stackSkillId
                ? data.onboarding.latestAttempt?.stackName
                : undefined
            }
            onSaved={() => setSaved(true)}
          />
        </FadeIn>
      )}
      {saved && (
        <FadeIn className="flex max-w-3xl flex-col items-start gap-3 rounded-xl bg-muted p-5 sm:flex-row sm:items-center sm:justify-between">
          <p role="status" className="text-sm">
            Опрос сохранён. Теперь можно выбрать тест.
          </p>
          <Button asChild variant="outline">
            <Link href={STATIC_ROUTES.CANDIDATE_ASSESSMENTS}>
              Перейти к тестам
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </FadeIn>
      )}
    </main>
  );
};
