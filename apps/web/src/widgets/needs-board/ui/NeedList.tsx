import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import type { Catalogs } from '@/entities/catalog';
import type { NeedStatus } from '@/entities/employer-need';

import type { NeedList as List } from '../model';
import { CountTabs } from './CountTabs';
import { NeedListContent } from './NeedListContent';

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
}: NeedListProps) => {
  return (
    <aside
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-2',
        detail && 'max-md:hidden',
      )}
      aria-label="Список потребностей"
    >
      <CountTabs
        value={list.status}
        disabled={list.pending}
        onChange={onStatus}
      >
        {!canWrite && (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            Вы наблюдатель: потребности доступны для просмотра.
          </p>
        )}
        <NeedListContent
          list={list}
          catalogs={catalogs}
          composer={composer}
          onSelect={onSelect}
          canWrite={canWrite}
        />
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
};
