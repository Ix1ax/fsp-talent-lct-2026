import Link from 'next/link';

import { DYNAMIC_ROUTES, STATIC_ROUTES } from '@/shared/contants';
import {
  AsyncState,
  Button,
  Skeleton,
  Stagger,
  StaggerItem,
} from '@/shared/ui';
import type { Catalogs, Skill } from '@/entities/catalog';

import type { useAssessments } from '../model';
import { AvailableAssessmentCard } from './AvailableAssessmentCard';

interface AvailableAssessmentsProps {
  state: ReturnType<typeof useAssessments>;
  catalogs?: Catalogs;
  skills: Skill[];
}

export const AvailableAssessments = ({
  state,
  catalogs,
  skills,
}: AvailableAssessmentsProps) => {
  const { current, error, errorType, refresh, loading, busy, items, select } =
    state;
  return (
    <div className="grid gap-6">
      <p className="text-sm text-muted-foreground">
        Перед тестированием можно{' '}
        <Link
          className="underline underline-offset-4"
          href={STATIC_ROUTES.CANDIDATE_SURVEY}
        >
          выбрать направление и уровень
        </Link>
        .
      </p>
      {current && (
        <Button asChild className="h-auto min-h-11 whitespace-normal">
          <Link href={DYNAMIC_ROUTES.CANDIDATE_ASSESSMENT(current)}>
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
                skills={skills}
                disabled={busy || !!current}
                onSelect={select}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
};
