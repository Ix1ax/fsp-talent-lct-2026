import { useCallback, useState } from 'react';
import { PlusIcon, SearchIcon, SlidersHorizontalIcon } from 'lucide-react';

import { confirmUnsavedChanges, useRemoteData } from '@/shared/hooks';
import { cn } from '@/shared/lib/utils';
import { Button, Input, OptionSelect, PageControls } from '@/shared/ui';
import type { Catalogs, Skill } from '@/entities/catalog';
import { NEED_STATUS_LABELS } from '@/entities/employer-need';
import { ArchiveNeedDialog } from '@/features/employer-need';
import {
  emptyVacancyFilters,
  filterVacancyFeed,
  hasVacancyFilters,
  loadStatusVacancies,
  type VacancyFilters as Filters,
} from '@/features/employer-search';

import type { EmployerGateway } from '../lib';
import type { EmployerBoard } from '../model';
import { VacancyDetailContent } from './VacancyDetailContent';
import { VacancyFeedContent } from './VacancyFeedContent';
import { VacancyFilters } from './VacancyFilters';

interface VacancyBankProps {
  board: EmployerBoard;
  active?: boolean;
  api: EmployerGateway;
  catalogs: Catalogs;
  skills: Skill[];
  composer: boolean;
  created?: boolean;
  dirty: boolean;
  archiveConfirm: boolean;
  onArchiveConfirm: (value: boolean) => void;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onBack: () => void;
  onDirtyChange: (value: boolean) => void;
  onCreated: () => void;
  onCandidate: (id: string) => void;
  guard: (action: () => void) => void;
}

export const VacancyBank = ({
  board,
  active = true,
  api,
  catalogs,
  skills,
  composer,
  created,
  dirty,
  archiveConfirm,
  onArchiveConfirm,
  onCreate,
  onSelect,
  onBack,
  onDirtyChange,
  onCreated,
  onCandidate,
  guard,
}: VacancyBankProps) => {
  const [filters, setFilters] = useState(emptyVacancyFilters);
  const [searchDraft, setSearchDraft] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filteredOffset, setFilteredOffset] = useState(0);

  const filtered = hasVacancyFilters(filters);
  const load = useCallback(
    (signal: AbortSignal) =>
      filtered
        ? loadStatusVacancies(api, board.companyId, board.status, signal)
        : Promise.resolve([]),
    [api, board.companyId, board.status, filtered],
  );

  const complete = useRemoteData(load, board.revision, active && filtered);

  const matches = filtered
    ? filterVacancyFeed(complete.data ?? [], filters)
    : [];

  const items = filtered
    ? matches.slice(filteredOffset, filteredOffset + 20)
    : board.items;

  const loading = filtered ? complete.loading : board.loading;
  const error = filtered ? complete.error : board.listError;

  const updateFilters = (patch: Partial<Filters>) => {
    setFilters((value) => ({ ...value, ...patch }));
    setFilteredOffset(0);
  };

  const reset = () => {
    setFilters(emptyVacancyFilters());
    setSearchDraft('');
    setFilteredOffset(0);
  };

  const canWrite = board.company?.memberRole !== 'viewer';
  const need = board.selected;

  if (composer || board.selectedId)
    return (
      <div className="grid w-full min-w-0 gap-5">
        <VacancyDetailContent
          board={board}
          active={active}
          catalogs={catalogs}
          skills={skills}
          composer={composer}
          created={created}
          dirty={dirty}
          api={api}
          onCreated={onCreated}
          onBack={onBack}
          onDirtyChange={onDirtyChange}
          onCandidate={onCandidate}
          onArchiveConfirm={onArchiveConfirm}
          guard={guard}
          need={need}
          canWrite={canWrite}
        />
        <ArchiveNeedDialog
          open={archiveConfirm}
          pending={board.pending}
          error={board.saveError}
          onOpenChange={onArchiveConfirm}
          onConfirm={async () => {
            if (dirty && !confirmUnsavedChanges())
              throw new DOMException('Архивирование отменено', 'AbortError');
            await board.archive();
          }}
        />
      </div>
    );

  return (
    <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <Button
        variant="outline"
        className="justify-self-start lg:hidden"
        aria-expanded={filtersOpen}
        aria-controls="vacancy-filters"
        onClick={() => setFiltersOpen((open) => !open)}
      >
        <SlidersHorizontalIcon />
        {filtersOpen ? 'Скрыть фильтры' : 'Фильтры потребностей'}
      </Button>
      <aside
        id="vacancy-filters"
        aria-label="Фильтры потребностей"
        className={cn('min-w-0', !filtersOpen && 'hidden lg:block')}
      >
        <VacancyFilters
          value={filters}
          catalogs={catalogs}
          disabled={board.pending}
          onChange={updateFilters}
          onReset={reset}
        />
      </aside>
      <div className="grid min-w-0 gap-4">
        <form
          role="search"
          aria-label="Поиск потребностей"
          className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-xl border border-border bg-card p-4 sm:flex sm:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            updateFilters({ query: searchDraft.trim() });
          }}
        >
          <div className="relative min-w-0 flex-1">
            <SearchIcon
              className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              aria-label="Название или описание потребности"
              placeholder="Название потребности или ключевые слова"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              disabled={board.pending}
              className="pl-9"
            />
          </div>
          <Button
            type="submit"
            disabled={board.pending}
            className="w-10 px-0 sm:w-auto sm:px-4"
          >
            <SearchIcon />
            <span className="sr-only sm:not-sr-only">Найти</span>
          </Button>
          {canWrite && (
            <Button
              type="button"
              variant="outline"
              disabled={board.pending}
              onClick={onCreate}
              className="col-span-2"
            >
              <PlusIcon />
              Создать потребность
            </Button>
          )}
        </form>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/60 p-2.5">
          <div
            role="tablist"
            aria-label="Статусы потребностей"
            className="flex flex-wrap gap-1"
          >
            {(['active', 'draft', 'archived'] as const).map((status) => (
              <Button
                key={status}
                role="tab"
                aria-selected={status === board.status}
                size="sm"
                variant={status === board.status ? 'secondary' : 'ghost'}
                disabled={board.pending}
                onClick={() =>
                  guard(() => {
                    setFilteredOffset(0);
                    board.chooseStatus(status);
                  })
                }
              >
                {NEED_STATUS_LABELS[status]}
              </Button>
            ))}
          </div>
          <OptionSelect
            aria-label="Сортировка потребностей"
            value={filters.sort}
            className="h-9 data-[size=default]:h-9 w-auto min-w-0 max-w-full border-0 bg-transparent text-xs"
            disabled={board.pending}
            onValueChange={(value) =>
              updateFilters({ sort: value as Filters['sort'] })
            }
            options={[
              { value: 'newest', label: 'Сначала новые' },
              { value: 'salary', label: 'Сначала высокая зарплата' },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <h2 className="text-base font-semibold">
            {filtered && !loading && !error
              ? `Найдено потребностей: ${matches.length}`
              : 'Потребности компании'}
          </h2>
          {filtered && (
            <Button
              variant="link"
              size="sm"
              onClick={reset}
              disabled={board.pending}
              className="h-auto p-0 text-brand-text"
            >
              Сбросить поиск и фильтры
            </Button>
          )}
        </div>
        <VacancyFeedContent
          board={board}
          catalogs={catalogs}
          skills={skills}
          onSelect={onSelect}
          onCreate={onCreate}
          items={items}
          filtered={filtered}
          loading={loading}
          error={error}
          retry={filtered ? complete.retry : board.reload}
          reset={reset}
          canWrite={canWrite}
        />
        {!loading && !error && (
          <PageControls
            offset={filtered ? filteredOffset : board.offset}
            count={items.length}
            total={filtered ? matches.length : undefined}
            hasMore={filtered ? undefined : board.hasMore}
            pending={board.pending}
            onPage={(offset) =>
              guard(() => {
                if (filtered) setFilteredOffset(offset);
                else board.page(offset);
              })
            }
          />
        )}
      </div>
    </div>
  );
};
