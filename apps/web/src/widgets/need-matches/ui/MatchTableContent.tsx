import { AsyncState, Skeleton } from '@/shared/ui';
import type { Catalogs } from '@/entities/catalog';

import type { useNeedMatches } from '../model';
import { MatchTableItem } from './MatchTableItem';

interface MatchTableContentProps {
  catalogs: Catalogs;
  onOpenCandidate?: (id: string) => void;
  data: ReturnType<typeof useNeedMatches>['data'];
  error: string;
  offset: number;
  retry: () => void;
}

export const MatchTableContent = ({
  data,
  error,
  offset,
  retry,
  catalogs,
  onOpenCandidate,
}: MatchTableContentProps) => {
  if (error) {
    return (
      <div className="p-4">
        <AsyncState
          error
          title="Не удалось загрузить подборку"
          description={error}
          onRetry={retry}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="grid gap-4 p-5"
        role="status"
        aria-label="Загрузка подборки"
      >
        {[1, 2, 3].map((n) => (
          <Skeleton key={n} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (data.items.length) {
    return data.items.map((candidate, index) => (
      <MatchTableItem
        key={candidate.id}
        candidate={candidate}
        catalogs={catalogs}
        position={offset + index + 1}
        onOpen={
          onOpenCandidate ? () => onOpenCandidate(candidate.id) : undefined
        }
      />
    ));
  }

  return (
    <div className="p-5">
      <AsyncState
        title="Пока нет подходящих кандидатов"
        description="Проверьте формат работы, бюджет, город и часовой пояс."
      />
    </div>
  );
};
