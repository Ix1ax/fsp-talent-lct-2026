import { AsyncState, Skeleton } from '@/shared/ui';
import type { Catalogs } from '@/entities/catalog';
import type { NeedStatus } from '@/entities/employer-need';

import type { NeedList as List } from '../model';
import { NeedListItem } from './NeedListItem';

interface NeedListContentProps {
  list: List;
  catalogs: Catalogs;
  canWrite: boolean;
  composer: boolean;
  onSelect: (id: string) => void;
}

export const NeedListContent = ({
  list,
  catalogs,
  composer,
  onSelect,
  canWrite,
}: NeedListContentProps) => {
  if (list.loading) {
    return (
      <div
        className="grid gap-4 p-4"
        role="status"
        aria-label="Загрузка потребностей"
      >
        {[1, 2, 3].map((v) => (
          <Skeleton key={v} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  if (list.listError) {
    return (
      <div className="p-2">
        <AsyncState
          error
          title="Не удалось загрузить потребности"
          description={list.listError}
          onRetry={list.reload}
        />
      </div>
    );
  }

  if (list.items.length) {
    return list.items.map((need) => (
      <NeedListItem
        key={need.id}
        need={need}
        catalogs={catalogs}
        selected={need.id === list.selectedId && !composer}
        onSelect={() => onSelect(need.id)}
      />
    ));
  }

  return (
    <div className="p-2">
      <AsyncState
        title={getEmptyNeedListTitle(list.status)}
        description={getEmptyNeedListDescription(list.status, canWrite)}
      />
    </div>
  );
};

const getEmptyNeedListDescription = (status: NeedStatus, canWrite: boolean) => {
  if (status === 'archived') {
    return 'Здесь появятся закрытые потребности.';
  }

  if (canWrite) {
    return 'Создайте потребность или продолжите работу с черновиком.';
  }

  return 'Владелец или рекрутер может добавить потребность.';
};

const getEmptyNeedListTitle = (status: NeedStatus) => {
  if (status === 'active') {
    return 'Нет активных потребностей';
  }

  if (status === 'draft') {
    return 'Нет черновиков';
  }

  return 'Архив пуст';
};
