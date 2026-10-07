'use client';

import Link from 'next/link';

import { Button } from '@/shared/ui';
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
    selected,
    busy,
    refresh,
    select,
    close,
    start,
  } = useAssessments();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <Link href="/candidate" className="text-sm underline">
        В кабинет
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Тестирование</h1>
        <p className="text-muted-foreground">
          Подтвердите навыки и грейд. Результаты проверяются автоматически.
        </p>
      </header>
      {current && (
        <Button asChild>
          <Link href={`/candidate/assessments/${current}`}>
            Продолжить активный тест
          </Link>
        </Button>
      )}
      {error && <p role="alert">{error}</p>}
      <Button
        className="self-start"
        variant="outline"
        disabled={loading || busy}
        onClick={refresh}
      >
        Обновить список
      </Button>
      {loading && <p role="status">Загружаем тесты…</p>}
      {!loading && !error && items.length === 0 && (
        <p>Доступных тестов пока нет.</p>
      )}
      {!loading &&
        items.map((test) => (
          <AvailableAssessmentCard
            key={`${test.specializationId}-${test.gradeId}`}
            test={test}
            catalogs={catalogs}
            disabled={busy || !!current}
            onSelect={select}
          />
        ))}
      <StartAssessmentDialog
        test={selected}
        busy={busy}
        onClose={close}
        onStart={start}
      />
    </main>
  );
};
