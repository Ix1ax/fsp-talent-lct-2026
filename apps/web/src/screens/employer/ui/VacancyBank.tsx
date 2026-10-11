import { SlidersHorizontalIcon } from 'lucide-react';

import { confirmUnsavedChanges } from '@/shared/hooks';
import { cn } from '@/shared/lib/utils';
import { Button, OptionSelect, PageControls } from '@/shared/ui';
import { type Catalogs, type Skill } from '@/entities/catalog';
import { NEED_STATUS_LABELS } from '@/entities/employer-need';
import { ArchiveNeedDialog } from '@/features/employer-need';
import { type VacancyFilters as Filters } from '@/features/employer-search';

import { type EmployerGateway } from '../lib';
import { type EmployerBoard, useVacancySearch } from '../model';
import { VacancyDetailContent } from './VacancyDetailContent';
import { VacancyFeedContent } from './VacancyFeedContent';
import { VacancyFilters } from './VacancyFilters';
import { VacancySearchForm } from './VacancySearchForm';

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
  const {
    filters,
    searchDraft,
    setSearchDraft,
    filtersOpen,
    setFiltersOpen,
    filteredOffset,
    setFilteredOffset,
    filtered,
    complete,
    matches,
    items,
    loading,
    error,
    updateFilters,
    reset,
    canWrite,
    need,
  } = useVacancySearch({ board, active, api });
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
        <VacancySearchForm
          board={board}
          searchDraft={searchDraft}
          setSearchDraft={setSearchDraft}
          updateFilters={updateFilters}
          canWrite={canWrite}
          onCreate={onCreate}
        />
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
