import { cn } from '@/shared/lib/utils';
import { Button, Skeleton } from '@/shared/ui';
import { AsyncState } from '@/shared/ui/AsyncState';
import type { Catalogs } from '@/entities/catalog';
import type { EmployerNeed, NeedStatus } from '@/entities/employer-need';

import { CountTabs } from './CountTabs';
import { NeedListItem } from './NeedListItem';
import { NewNeedTemplate } from './NewNeedTemplate';
interface NeedListProps {
  list: {
    status: NeedStatus;
    pending: boolean;
    loading: boolean;
    listError: string;
    items: EmployerNeed[];
    selectedId: string;
    offset: number;
    hasMore: boolean;
    reload: () => void;
  };
  catalogs: Catalogs;
  canWrite: boolean;
  detail: boolean;
  composer: boolean;
  onStatus: (status: NeedStatus) => void;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onPage: (offset: number) => void;
}
export const NeedList = ({
  list,
  catalogs,
  canWrite,
  detail,
  composer,
  onStatus,
  onCreate,
  onSelect,
  onPage,
}: NeedListProps) => (
  <aside
    className={cn(
      'min-w-0 border-r border-border bg-card',
      detail && 'max-md:hidden',
    )}
    aria-label="Список потребностей"
  >
    <div className="px-4 pb-4 pt-6 xl:px-5">
      <h1 className="text-[28px] font-extrabold leading-none tracking-tight xl:text-[32px]">
        Потребности
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        Кого ищет команда. Выберите строку — откроются бриф и подборка.
      </p>
    </div>
    <CountTabs value={list.status} disabled={list.pending} onChange={onStatus}>
      {canWrite && (
        <NewNeedTemplate disabled={list.pending} onClick={onCreate} />
      )}
      {!canWrite && (
        <p className="border-b border-border p-4 text-xs text-muted-foreground">
          Вы наблюдатель: потребности доступны для просмотра.
        </p>
      )}
      {list.loading ? (
        <div
          className="grid gap-4 p-4"
          role="status"
          aria-label="Загрузка потребностей"
        >
          {[1, 2, 3].map((v) => (
            <Skeleton key={v} className="h-28 rounded-none" />
          ))}
        </div>
      ) : list.listError ? (
        <div className="p-4">
          <AsyncState
            error
            title="Не удалось загрузить потребности"
            description={list.listError}
            onRetry={list.reload}
          />
        </div>
      ) : list.items.length ? (
        list.items.map((need) => (
          <NeedListItem
            key={need.id}
            need={need}
            catalogs={catalogs}
            selected={need.id === list.selectedId && !composer}
            onSelect={() => onSelect(need.id)}
          />
        ))
      ) : (
        <div className="p-4">
          <AsyncState
            title={
              list.status === 'active'
                ? 'Нет активных потребностей'
                : list.status === 'draft'
                  ? 'Нет черновиков'
                  : 'Архив пуст'
            }
            description={
              list.status === 'archived'
                ? 'Здесь появятся закрытые потребности.'
                : canWrite
                  ? 'Создайте потребность или продолжите работу с черновиком.'
                  : 'Владелец или рекрутер может добавить потребность.'
            }
          />
        </div>
      )}
      {(list.offset > 0 || list.hasMore) && !list.loading && (
        <div className="flex justify-between gap-3 p-4">
          <Button
            variant="outline"
            disabled={!list.offset || list.pending}
            onClick={() => onPage(Math.max(0, list.offset - 20))}
          >
            Назад
          </Button>
          <Button
            variant="outline"
            disabled={!list.hasMore || list.pending}
            onClick={() => onPage(list.offset + 20)}
          >
            Далее
          </Button>
        </div>
      )}
    </CountTabs>
  </aside>
);
