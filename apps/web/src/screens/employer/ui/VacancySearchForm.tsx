import { PlusIcon, SearchIcon } from 'lucide-react';

import { Button, Input } from '@/shared/ui';
import { type VacancyFilters as Filters } from '@/features/employer-search';

import { type EmployerBoard } from '../model';

interface VacancySearchFormProps {
  board: EmployerBoard;
  searchDraft: string;
  setSearchDraft: (value: string) => void;
  updateFilters: (patch: Partial<Filters>) => void;
  canWrite: boolean;
  onCreate: () => void;
}
export const VacancySearchForm = ({
  board,
  searchDraft,
  setSearchDraft,
  updateFilters,
  canWrite,
  onCreate,
}: VacancySearchFormProps) => {
  return (
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
  );
};
