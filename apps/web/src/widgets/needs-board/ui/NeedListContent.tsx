import { RemoteState, Skeleton } from '@/shared/ui';
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
  return (
    <RemoteState
      loading={list.loading}
      error={list.listError}
      retry={list.reload}
      loadingLabel="Загрузка потребностей"
      errorTitle="Не удалось загрузить потребности"
      loadingContent={
        <div className="grid gap-4 p-4">
          {[1, 2, 3].map((v) => (
            <Skeleton key={v} className="h-24 rounded-lg" />
          ))}
        </div>
      }
      empty={!list.items.length}
      emptyTitle={getEmptyNeedListTitle(list.status)}
      emptyDescription={getEmptyNeedListDescription(list.status, canWrite)}
    >
      {list.items.map((need) => (
        <NeedListItem
          key={need.id}
          need={need}
          catalogs={catalogs}
          selected={need.id === list.selectedId && !composer}
          onSelect={() => onSelect(need.id)}
        />
      ))}
    </RemoteState>
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
