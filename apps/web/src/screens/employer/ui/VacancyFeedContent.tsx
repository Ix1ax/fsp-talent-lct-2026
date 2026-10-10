import { PlusIcon, SearchIcon } from 'lucide-react';

import { AsyncState, Button, Skeleton } from '@/shared/ui';
import type { Catalogs, Skill } from '@/entities/catalog';

import type { EmployerBoard } from '../model';
import { VacancyCard } from './VacancyCard';

interface VacancyFeedContentProps {
  board: EmployerBoard;
  catalogs: Catalogs;
  skills: Skill[];
  onCreate: () => void;
  onSelect: (id: string) => void;
  items: EmployerBoard['items'];
  filtered: boolean;
  loading: boolean;
  error: string;
  retry: () => void;
  reset: () => void;
  canWrite: boolean;
}

const getEmptyVacancyTitle = (
  filtered: boolean,
  status: EmployerBoard['status'],
) => {
  if (filtered) {
    return 'Ничего не найдено';
  }

  if (status === 'archived') {
    return 'Архив пуст';
  }

  return 'Потребностей пока нет';
};

export const VacancyFeedContent = ({
  board,
  catalogs,
  skills,
  onSelect,
  onCreate,
  items,
  filtered,
  loading,
  error,
  retry,
  reset,
  canWrite,
}: VacancyFeedContentProps) => {
  if (loading) {
    return (
      <div
        role="status"
        aria-label="Загрузка потребностей"
        className="grid gap-4"
      >
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <AsyncState
        error
        title="Не удалось загрузить потребности"
        description={error}
        onRetry={retry}
        className="rounded-xl bg-card"
      />
    );
  }

  if (items.length && board.company) {
    return items.map((item) => (
      <VacancyCard
        key={item.id}
        need={item}
        catalogs={catalogs}
        skills={skills}
        busy={board.pending}
        onOpen={() => onSelect(item.id)}
      />
    ));
  }

  return (
    <div className="grid justify-items-center gap-3 rounded-xl border border-dashed bg-card p-8 text-center sm:p-12">
      <SearchIcon className="size-8 text-muted-foreground" />
      <h2 className="text-lg font-semibold">
        {getEmptyVacancyTitle(filtered, board.status)}
      </h2>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        {filtered
          ? 'Попробуйте другие условия поиска или сбросьте фильтры.'
          : 'Потребности выбранной компании появятся здесь. Начните с черновика и заполните его по шагам.'}
      </p>
      {filtered ? (
        <Button variant="outline" onClick={reset}>
          Сбросить фильтры
        </Button>
      ) : (
        canWrite && (
          <Button disabled={board.pending} onClick={onCreate}>
            <PlusIcon />
            Создать потребность
          </Button>
        )
      )}
    </div>
  );
};
