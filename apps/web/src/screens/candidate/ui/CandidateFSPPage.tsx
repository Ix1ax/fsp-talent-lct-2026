'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button, FadeIn, PageHeader, PageWrapper } from '@/shared/ui';
import { CandidateFSP } from '@/features/candidate/fsp';

export const CandidateFSPPage = () => {
  return (
    <PageWrapper>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Content>
            <PageHeader.Title>Достижения ФСП</PageHeader.Title>
            <PageHeader.Description>
              Управляйте привязкой и импортированными результатами соревнований.
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
      <FadeIn className="max-w-4xl">
        <CandidateFSP />
      </FadeIn>
    </PageWrapper>
  );
};
