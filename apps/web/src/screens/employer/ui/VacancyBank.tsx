import { useCallback, useState } from 'react';
import {
  ArrowLeftIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from 'lucide-react';

import { confirmUnsavedChanges } from '@/shared/hooks';
import { useRemoteData } from '@/shared/hooks/useRemoteData';
import { cn } from '@/shared/lib/utils';
import { AsyncState, Button, Input, OptionSelect, Skeleton } from '@/shared/ui';
import { PageControls } from '@/shared/ui/workspace/PageControls';
import type { Catalogs, Skill } from '@/entities/catalog';
import { NEED_STATUS_LABELS } from '@/entities/employer-need';
import {
  ArchiveNeedDialog,
  emptyNeed,
  NeedActions,
  NeedFlowEditor,
} from '@/features/employer-need';
import {
  emptyVacancyFilters,
  filterVacancyFeed,
  hasVacancyFilters,
  loadStatusVacancies,
  type VacancyFilters as Filters,
} from '@/features/employer-search';
import { MatchTable } from '@/widgets/need-matches';

import type { EmployerGateway } from '../lib/gateway';
import type { EmployerBoard } from '../model/useEmployerBoard';
import { VacancyCard } from './VacancyCard';
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
      <div className="mx-auto grid w-full min-w-0 max-w-5xl gap-5">
        {composer ? (
          <NeedFlowEditor
            active={active}
            key="new"
            initial={emptyNeed()}
            isNew
            catalogs={catalogs}
            skills={skills}
            pending={board.pending}
            error={board.saveError}
            onSave={async (input) => {
              await board.save(input, true);
              onCreated();
            }}
            onBack={onBack}
            onDirtyChange={onDirtyChange}
          />
        ) : board.detailLoading ? (
          <Skeleton className="h-96" />
        ) : board.detailError ? (
          <>
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeftIcon />К списку потребностей
            </Button>
            <AsyncState
              error
              title="Потребность недоступна"
              description={board.detailError}
              onRetry={board.reload}
            />
          </>
        ) : need ? (
          <>
            <NeedFlowEditor
              active={active}
              key={`${need.id}-${need.status === 'archived'}`}
              initial={need}
              initialStep={created ? 1 : 0}
              catalogs={catalogs}
              skills={skills}
              readonly={!canWrite || need.status === 'archived'}
              pending={board.pending}
              error={board.saveError}
              onSave={(value) => board.save(value, false)}
              onBack={onBack}
              onDirtyChange={onDirtyChange}
            />
            <NeedActions
              status={need.status}
              canWrite={canWrite}
              pending={board.pending}
              dirty={dirty}
              onFind={() =>
                document
                  .getElementById('vacancy-matches')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              onRestore={() => void board.restore().catch(() => {})}
              onArchive={() => onArchiveConfirm(true)}
              onDuplicate={() =>
                guard(() => {
                  void board.duplicate().catch(() => {});
                })
              }
            />
            {need.status === 'active' && (
              <div id="vacancy-matches" className="scroll-mt-24">
                <MatchTable
                  key={`${need.id}-${board.revision}`}
                  companyId={board.companyId}
                  needId={need.id}
                  catalogs={catalogs}
                  load={api.recommendations}
                  onOpenCandidate={onCandidate}
                />
              </div>
            )}
            {need.status === 'draft' && (
              <AsyncState
                title="Подбор появится после активации"
                description="Добавьте навыки и форматы работы, затем активируйте потребность на шаге «Готовность»."
              />
            )}
            {board.saveError && (
              <p role="alert" className="text-sm text-destructive">
                {board.saveError}
              </p>
            )}
          </>
        ) : null}
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
        className={cn(
          'min-w-0 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto',
          !filtersOpen && 'hidden lg:block',
        )}
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
          className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl border border-border/60 bg-card p-4 sm:flex sm:p-5"
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
              className="h-11 border-0 bg-muted/60 pl-9"
            />
          </div>
          <Button
            type="submit"
            disabled={board.pending}
            className="h-11 w-11 px-0 sm:w-auto sm:px-4"
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
              className="col-span-2 h-11"
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
        {loading ? (
          <div
            role="status"
            aria-label="Загрузка потребностей"
            className="grid gap-4"
          >
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
        ) : error ? (
          <AsyncState
            error
            title="Не удалось загрузить потребности"
            description={error}
            onRetry={filtered ? complete.retry : board.reload}
            className="rounded-2xl bg-card"
          />
        ) : items.length && board.company ? (
          items.map((item) => (
            <VacancyCard
              key={item.id}
              need={item}
              company={board.company!}
              catalogs={catalogs}
              skills={skills}
              busy={board.pending}
              onOpen={() => onSelect(item.id)}
            />
          ))
        ) : (
          <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed bg-card p-8 text-center sm:p-12">
            <SearchIcon className="size-8 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              {filtered
                ? 'Ничего не найдено'
                : board.status === 'archived'
                  ? 'Архив пуст'
                  : 'Потребностей пока нет'}
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
        )}
        {!loading && !error && (
          <PageControls
            offset={filtered ? filteredOffset : board.offset}
            count={items.length}
            total={filtered ? matches.length : undefined}
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
