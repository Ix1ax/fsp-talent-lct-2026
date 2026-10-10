import { RemoteState, Skeleton } from '@/shared/ui';
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
  return (
    <RemoteState
      loading={!data && !error}
      error={error}
      retry={retry}
      loadingLabel="Загрузка подборки"
      errorTitle="Не удалось загрузить подборку"
      loadingContent={
        <div className="grid gap-4 p-5">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      }
      empty={Boolean(data && !data.items.length)}
      emptyTitle="Пока нет подходящих кандидатов"
      emptyDescription="Проверьте формат работы, бюджет, город и часовой пояс."
    >
      {data &&
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
        ))}
    </RemoteState>
  );
};
