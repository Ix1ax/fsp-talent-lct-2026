'use client';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button, FadeIn, PageHeader } from '@/shared/ui';
import { CandidateFSP } from '@/features/candidate/fsp';
export const CandidateFSPPage = () => (
  <main className="container-page page-rhythm flex flex-1 flex-col gap-8">
    <PageHeader
      title="Достижения ФСП"
      description="Управляйте привязкой и импортированными результатами соревнований."
      actions={
        <Button asChild variant="outline">
          <Link href={STATIC_ROUTES.CANDIDATE}>
            <ArrowLeftIcon aria-hidden="true" />В кабинет
          </Link>
        </Button>
      }
    />
    <FadeIn className="max-w-4xl">
      <CandidateFSP />
    </FadeIn>
  </main>
);
