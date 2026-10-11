'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { useRemoteData } from '@/shared/hooks';
import { Button, FadeIn, PageWrapper, RemoteState } from '@/shared/ui';

import { CANDIDATE_PAGE_HEADERS } from '../constants';
import { loadCandidateSurvey } from '../model';
import { CandidatePageHeader } from './CandidatePageHeader';
import { CandidateSurveyContent } from './CandidateSurveyContent';

export const CandidateSurveyPage = () => {
  const query = useRemoteData(loadCandidateSurvey);
  const [saved, setSaved] = useState(false);
  const data = query.data;

  return (
    <PageWrapper>
      <CandidatePageHeader {...CANDIDATE_PAGE_HEADERS.survey} />
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
