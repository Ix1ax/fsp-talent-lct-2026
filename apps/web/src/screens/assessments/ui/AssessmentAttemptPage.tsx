'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button, PageHeader, PageWrapper } from '@/shared/ui';

import { useAssessmentAttempt } from '../model';
import { AssessmentAttemptContent } from './AssessmentAttemptContent';

interface AssessmentAttemptPageProps {
  attemptId: string;
}

export const AssessmentAttemptPage = ({
  attemptId,
}: AssessmentAttemptPageProps) => {
  const state = useAssessmentAttempt(attemptId);

  return (
    <PageWrapper>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Content>
            <PageHeader.Title>Тестирование навыков</PageHeader.Title>
          </PageHeader.Content>
          <PageHeader.Actions>
            <Button asChild variant="outline">
              <Link href={STATIC_ROUTES.CANDIDATE_ASSESSMENTS}>
                <ArrowLeftIcon aria-hidden="true" />К списку тестов
              </Link>
            </Button>
          </PageHeader.Actions>
        </PageHeader.Row>
      </PageHeader>
      <AssessmentAttemptContent state={state} />
    </PageWrapper>
  );
};
