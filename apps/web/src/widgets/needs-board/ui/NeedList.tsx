import { cn } from '@/shared/lib/utils';
import { AsyncState, Button, Skeleton } from '@/shared/ui';
import type { Catalogs } from '@/entities/catalog';
import type { NeedStatus } from '@/entities/employer-need';

import type { NeedList as List } from '../model';
import { CountTabs } from './CountTabs';
import { NeedListItem } from './NeedListItem';

interface NeedListProps {
  list: List;
  catalogs: Catalogs;
  canWrite: boolean;
  detail: boolean;
  composer: boolean;
  onStatus: (status: NeedStatus) => void;
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
  onSelect,
  onPage,
}: NeedListProps) => (
  <aside
    className={cn(
      'flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-2',
      detail && 'max-md:hidden',
    )}
    aria-label="Список потребностей"
  >
    <CountTabs value={list.status} disabled={list.pending} onChange={onStatus}>
      {!canWrite && (
        <p className="px-3 py-2 text-xs text-muted-foreground">
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
            <Skeleton key={v} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : list.listError ? (
        <div className="p-2">
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
        <div className="p-2">
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
        <div className="flex justify-between gap-3 p-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!list.offset || list.pending}
            onClick={() => onPage(Math.max(0, list.offset - 20))}
          >
            Назад
          </Button>
          <Button
            variant="outline"
            size="sm"
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
