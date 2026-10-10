'use client';

import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button, PageHeader, Stagger } from '@/shared/ui';

import { PROFILE_STEPS } from '../constants';
import { ProfileStepItem } from './ProfileStepItem';

export const CandidateProfileOverview = () => {
  return (
    <main className="container-page page-rhythm flex flex-1 flex-col gap-8">
      <PageHeader
        title="Мой кабинет"
        description="Заполните профиль по разделам. Вы можете начать с любого шага и вернуться к остальным позже. Публикацией профиля управляете вы."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={STATIC_ROUTES.OFFERS}>Входящие предложения</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={STATIC_ROUTES.CANDIDATE_TASKS}>Задания компаний</Link>
            </Button>
          </>
        }
      />
      <nav aria-label="Разделы профиля">
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROFILE_STEPS.map((step, index) => (
            <ProfileStepItem key={index} step={step} number={index + 1} />
          ))}
        </Stagger>
      </nav>
      <div className="flex flex-col items-start gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-medium">Подтвердите навыки</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Пройдите тесты по выбранному стеку и уровню.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={STATIC_ROUTES.CANDIDATE_ASSESSMENTS}>
            Перейти к тестам
            <ArrowRightIcon />
          </Link>
        </Button>
      </div>
    </main>
  );
};
