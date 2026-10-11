import { useCallback, useState } from 'react';

import { useRemoteData } from '@/shared/hooks';
import {
  emptyVacancyFilters,
  filterVacancyFeed,
  hasVacancyFilters,
  loadStatusVacancies,
  type VacancyFilters as Filters,
} from '@/features/employer-search';

import { type EmployerGateway } from '../lib';
import { type EmployerBoard } from './index';

export type VacancySearchOptions = {
  board: EmployerBoard;
  active?: boolean;
  api: EmployerGateway;
};

export const useVacancySearch = ({
  board,
  active = true,
  api,
}: VacancySearchOptions) => {
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

  return {
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
  };
};
