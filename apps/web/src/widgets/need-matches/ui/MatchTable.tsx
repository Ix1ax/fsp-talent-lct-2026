'use client';

import { AsyncState, PageControls, Skeleton } from '@/shared/ui';
import type { Catalogs } from '@/entities/catalog';
import { getRecommendations } from '@/entities/employer-need';

import { useNeedMatches } from '../model';
import { MatchTableItem } from './MatchTableItem';

const CRITERIA_LABELS: Record<string, string> = {
  specialization: 'специализация',
  grade: 'грейд',
  skills: 'навыки',
  work_format: 'формат работы',
  salary: 'зарплата',
  city: 'город',
  timezone: 'часовой пояс',
};

interface MatchTableProps {
  companyId: string;
  needId: string;
  catalogs: Catalogs;
  load?: typeof getRecommendations;
  onOpenCandidate?: (id: string) => void;
}

export const MatchTable = ({
  companyId,
  needId,
  catalogs,
  load = getRecommendations,
  onOpenCandidate,
}: MatchTableProps) => {
  const { data, error, offset, setOffset, retry } = useNeedMatches(
    companyId,
    needId,
    load,
  );

  return (
    <section
      className="overflow-hidden rounded-xl border border-border bg-card"
      aria-label="Подборка кандидатов"
    >
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-lg font-semibold">
          Подборка кандидатов {data ? `· ${data.total}` : ''}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Сходство с требованиями потребности по квалификации и условиям работы.
        </p>
      </div>
      {error ? (
        <div className="p-4">
          <AsyncState
            error
            title="Не удалось загрузить подборку"
            description={error}
            onRetry={retry}
          />
        </div>
      ) : !data ? (
        <div
          className="grid gap-4 p-5"
          role="status"
          aria-label="Загрузка подборки"
        >
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : data.items.length ? (
        data.items.map((candidate, index) => (
          <MatchTableItem
            key={candidate.id}
            candidate={candidate}
            catalogs={catalogs}
            position={offset + index + 1}
            onOpen={
              onOpenCandidate ? () => onOpenCandidate(candidate.id) : undefined
            }
          />
        ))
      ) : (
        <div className="p-5">
          <AsyncState
            title="Пока нет подходящих кандидатов"
            description="Проверьте формат работы, бюджет, город и часовой пояс."
          />
        </div>
      )}
      {data && (
        <div className="p-4">
          <PageControls
            offset={offset}
            count={data.items.length}
            limit={data.limit}
            total={data.total}
            onPage={setOffset}
          />
        </div>
      )}
      {data && (
        <p className="px-5 pt-4 text-sm text-muted-foreground">
          Режим:{' '}
          {data.matchingMode === 'similarity'
            ? 'Сходство с требованиями'
            : data.matchingMode === 'conditions_only'
              ? 'Совпадение условий работы'
              : 'Подборка по данным сервера'}
          .{' '}
          {data.unassessedCriteria.length > 0 &&
            `Не оценены: ${data.unassessedCriteria.map((criterion) => CRITERIA_LABELS[criterion] ?? criterion).join(', ')}`}
        </p>
      )}
      <p className="px-5 py-4 text-sm leading-relaxed text-muted-foreground">
        Профили обезличены. Оценка совпадения показывает сходство с
        требованиями, а не вероятность найма.
      </p>
    </section>
  );
};
