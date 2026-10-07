'use client';

import { AsyncState, Button, Skeleton } from '@/shared/ui';
import { MetaLabel } from '@/shared/ui/MetaLabel';
import type { Catalogs } from '@/entities/catalog';
import { getRecommendations } from '@/entities/employer-need';

import { useNeedMatches } from '../model';
import { MatchTableItem } from './MatchTableItem';

interface MatchTableProps {
  companyId: string;
  needId: string;
  catalogs: Catalogs;
  load?: typeof getRecommendations;
}

export const MatchTable = ({
  companyId,
  needId,
  catalogs,
  load = getRecommendations,
}: MatchTableProps) => {
  const { data, error, offset, setOffset, retry } = useNeedMatches(
    companyId,
    needId,
    load,
  );

  return (
    <section
      className="border border-border bg-card"
      aria-label="Подборка кандидатов"
    >
      <div className="border-b border-border px-5 py-4">
        <MetaLabel className="text-[11px]">
          Совпадения по условиям {data ? `· ${data.total}` : ''}
        </MetaLabel>
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
            <Skeleton key={n} className="h-12 w-full rounded-none" />
          ))}
        </div>
      ) : data.items.length ? (
        data.items.map((candidate) => (
          <MatchTableItem
            key={candidate.id}
            candidate={candidate}
            catalogs={catalogs}
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
      {data && data.total > data.limit && (
        <div className="flex items-center justify-between gap-2 border-t border-border p-4">
          <Button
            variant="outline"
            disabled={!offset}
            onClick={() => setOffset((v) => Math.max(0, v - data.limit))}
          >
            Назад
          </Button>
          <span className="text-xs text-muted-foreground">
            {offset + 1}–{Math.min(offset + data.items.length, data.total)} из{' '}
            {data.total}
          </span>
          <Button
            variant="outline"
            disabled={offset + data.limit >= data.total}
            onClick={() => setOffset((v) => v + data.limit)}
          >
            Далее
          </Button>
        </div>
      )}
      <p className="px-5 py-3 text-xs leading-relaxed text-muted-foreground">
        Сравниваем формат, вилку, город и часовой пояс. Квалификация не
        оценивается. Профили анонимны; контакты после принятия предложения
        запрашиваются отдельно и могут быть недоступны.
      </p>
    </section>
  );
};
