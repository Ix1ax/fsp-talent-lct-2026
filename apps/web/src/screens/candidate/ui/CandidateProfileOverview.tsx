'use client';

import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button, Stagger } from '@/shared/ui';

import { PROFILE_STEPS } from '../constants';
import { ProfileStepItem } from './ProfileStepItem';

export const CandidateProfileOverview = () => {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10">
      <header className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-2xl font-semibold sm:text-3xl">Мой кабинет</h1>
        <p className="text-base text-muted-foreground">
          Заполните профиль по разделам. Вы можете начать с любого шага и
          вернуться к остальным позже. Публикацией профиля управляете вы.
        </p>
      </header>
      <Button asChild variant="outline" className="self-start">
        <Link href={STATIC_ROUTES.OFFERS}>Входящие предложения</Link>
      </Button>
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
        <Button asChild variant="outline" size="lg">
          <Link href={STATIC_ROUTES.CANDIDATE_ASSESSMENTS}>
            Перейти к тестам
            <ArrowRightIcon />
          </Link>
        </Button>
      </div>
    </main>
  );
};
