'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

import {
  AsyncState,
  Button,
  FadeIn,
  Skeleton,
  Stagger,
  StaggerItem,
} from '@/shared/ui';
import type { Catalogs } from '@/entities/catalog';

import { useAssessments } from '../model';
import { AvailableAssessmentCard } from './AvailableAssessmentCard';
import { StartAssessmentDialog } from './StartAssessmentDialog';

interface AssessmentsPageProps {
  catalogs?: Catalogs;
}

export const AssessmentsPage = ({ catalogs }: AssessmentsPageProps) => {
  const {
    items,
    current,
    loading,
    error,
    errorType,
    selected,
    busy,
    refresh,
    select,
    close,
    start,
  } = useAssessments();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <Button asChild variant="outline" className="min-h-11 self-start">
        <Link href="/candidate">
          <ArrowLeftIcon aria-hidden="true" />В кабинет
        </Link>
      </Button>
      <FadeIn className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold sm:text-3xl">Тестирование</h1>
        <p className="text-muted-foreground">
          Подтвердите навыки и грейд. Результаты проверяются автоматически.
        </p>
      </FadeIn>
      {current && (
        <Button asChild className="h-auto min-h-11 whitespace-normal">
          <Link href={`/candidate/assessments/${current}`}>
            Продолжить активный тест
          </Link>
        </Button>
      )}
      {error && (
        <AsyncState
          error
          title={
            errorType === 'start'
              ? 'Не удалось начать тест'
              : 'Не удалось загрузить тесты'
          }
          description={error}
          onRetry={refresh}
        />
      )}
      <Button
        className="min-h-11 self-start"
        variant="outline"
        disabled={loading || busy}
        onClick={refresh}
      >
        Обновить список
      </Button>
      {loading && (
        <div role="status" aria-label="Загружаем тесты" className="grid gap-4">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <AsyncState
          title="Доступных тестов пока нет"
          description="Проверьте навыки в профиле. Новые тесты появятся здесь, когда станут доступны."
        />
      )}
      {!loading && (
        <Stagger
          interval={Math.min(0.04, 0.2 / Math.max(1, items.length))}
          className="grid gap-4"
        >
          {items.map((test, index) => (
            <StaggerItem
              key={`${test.specializationId}-${test.gradeId}-${index}`}
              className="min-w-0"
            >
              <AvailableAssessmentCard
                test={test}
                catalogs={catalogs}
                disabled={busy || !!current}
                onSelect={select}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}
      <StartAssessmentDialog
        test={selected}
        busy={busy}
        onClose={close}
        onStart={start}
      />
    </main>
  );
};
