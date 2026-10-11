'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { useRemoteData } from '@/shared/hooks';
import {
  Button,
  FadeIn,
  PageHeader,
  PageWrapper,
  RemoteState,
} from '@/shared/ui';

import { loadCandidateSurvey } from '../model';
import { CandidateSurveyContent } from './CandidateSurveyContent';

export const CandidateSurveyPage = () => {
  const query = useRemoteData(loadCandidateSurvey);
  const [saved, setSaved] = useState(false);
  const data = query.data;

  return (
    <PageWrapper>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Content>
            <PageHeader.Title>Направление и уровень</PageHeader.Title>
            <PageHeader.Description>
              Выберите стек и оцените свой уровень. Эти данные помогут начать
              тестирование.
            </PageHeader.Description>
          </PageHeader.Content>
          <PageHeader.Actions>
            <Button asChild variant="outline">
              <Link href={STATIC_ROUTES.CANDIDATE}>
                <ArrowLeftIcon aria-hidden="true" />В кабинет
              </Link>
            </Button>
          </PageHeader.Actions>
        </PageHeader.Row>
      </PageHeader>
      <RemoteState
        loading={query.loading}
        error={query.error}
        retry={query.retry}
      />
      {data && (
        <CandidateSurveyContent data={data} onSaved={() => setSaved(true)} />
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
    </PageWrapper>
  );
};
