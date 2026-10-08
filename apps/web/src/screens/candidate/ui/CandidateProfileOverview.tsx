'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRightIcon } from 'lucide-react';

import { DYNAMIC_ROUTES } from '@/shared/contants';
import { useMotionSettings } from '@/shared/hooks';
import { Button, Stagger, StaggerItem } from '@/shared/ui';

import { PROFILE_STEP_DESCRIPTIONS, PROFILE_STEPS } from '../constants';

const MotionLink = motion.create(Link);

export const CandidateProfileOverview = () => {
  const { reducedMotion, transition } = useMotionSettings();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 py-8 sm:px-6 sm:py-10">
      <header className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-3xl font-semibold">Мой кабинет</h1>
        <p className="text-base text-muted-foreground">
          Заполните профиль по разделам. Вы можете начать с любого шага и
          вернуться к остальным позже. Публикацией профиля управляете вы.
        </p>
      </header>
      <nav aria-label="Разделы профиля">
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROFILE_STEPS.map((step, index) => (
            <StaggerItem key={step.id}>
              <MotionLink
                href={DYNAMIC_ROUTES.CANDIDATE(step.id)}
                transition={transition}
                whileHover={reducedMotion ? undefined : { y: -2 }}
                whileTap={reducedMotion ? undefined : { scale: 0.99 }}
                className="group flex h-full min-h-40 flex-col gap-3 rounded-xl border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent/30 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    Раздел {index + 1}
                  </span>
                  <ArrowRightIcon
                    className="size-4 text-muted-foreground transition-colors group-hover:text-foreground"
                    aria-hidden="true"
                  />
                </div>
                <h2 className="text-lg font-semibold">{step.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {PROFILE_STEP_DESCRIPTIONS[step.id]}
                </p>
              </MotionLink>
            </StaggerItem>
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
          <Link href={DYNAMIC_ROUTES.CANDIDATE('assessments')}>
            Перейти к тестам
            <ArrowRightIcon />
          </Link>
        </Button>
      </div>
    </main>
  );
};
