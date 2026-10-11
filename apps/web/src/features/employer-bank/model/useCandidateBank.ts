import { useCallback, useState } from 'react';

import { useRemoteData } from '@/shared/hooks';
import { type Company } from '@/entities/company';
import {
  type BankFilters,
  type EmployerBankApi,
  validateBankFilters,
} from '@/entities/employer-bank';
import {
  type EmployerNeed,
  type RecommendationPage,
} from '@/entities/employer-need';

import { filtersMatchNeed } from '../lib';

type SearchResults =
  | Awaited<ReturnType<EmployerBankApi['getBankCandidates']>>
  | RecommendationPage;
export type CandidateBankOptions = {
  company: Company;
  api: EmployerBankApi;
  onBusyChange: (busy: boolean) => void;
  loadNeeds: (signal: AbortSignal) => Promise<EmployerNeed[]>;
  revision: number;
};

export const useCandidateBank = ({
  company,
  api,
  onBusyChange,
  loadNeeds,
  revision,
}: CandidateBankOptions) => {
  const [filters, setFilters] = useState<BankFilters>({});
  const [experienceMin, setExperienceMin] = useState('');
  const [experienceMax, setExperienceMax] = useState('');
  const [offset, setOffset] = useState(0);
  const [candidateId, setCandidateId] = useState('');
  const [offer, setOffer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [referenceNeedId, setReferenceNeedId] = useState('');
  const needs = useRemoteData(loadNeeds, revision);
  const referenceNeed = needs.data?.find((need) => need.id === referenceNeedId);
  const experienceInvalid = [experienceMin, experienceMax].some(
    (value) =>
      value !== '' &&
      (!Number.isFinite(Number(value)) ||
        Number(value) < 0 ||
        Number(value) > 50),
  );

  const filterError = experienceInvalid
    ? 'Укажите опыт от 0 до 50 лет.'
    : validateBankFilters(filters);
  const selectedNeed =
    referenceNeed && !filterError && filtersMatchNeed(filters, referenceNeed)
      ? referenceNeed
      : undefined;

  const needId = selectedNeed?.id ?? '';
  const load = useCallback(
    (signal: AbortSignal) => {
      if (filterError) return Promise.reject(new Error(filterError));
      if (needId) {
        if (!selectedNeed)
          return Promise.reject(
            new Error(
              'Выбранная потребность недоступна. Выберите другую или сбросьте фильтры.',
            ),
          );
        return api.getNeedCandidates(
          company.id,
          needId,
          filters,
          offset,
          signal,
        );
      }
      return api.getBankCandidates(company.id, filters, offset, signal);
    },
    [api, company.id, filterError, filters, offset, needId, selectedNeed],
  );

  const remote = useRemoteData<SearchResults>(load);
  const change = (patch: Partial<BankFilters>) => {
    setFilters((value) => ({ ...value, ...patch }));
    setOffset(0);
  };
  const reset = () => {
    setReferenceNeedId('');
    setFilters({});
    setExperienceMin('');
    setExperienceMax('');
    setOffset(0);
  };

  const recommendations =
    remote.data && 'needId' in remote.data
      ? (remote.data as RecommendationPage)
      : null;
  const bank = remote.data && !('needId' in remote.data) ? remote.data : null;
  const busyChanged = useCallback(
    (value: boolean) => {
      setBusy(value);
      onBusyChange(value);
    },
    [onBusyChange],
  );

  return {
    filters,
    setFilters,
    experienceMin,
    setExperienceMin,
    experienceMax,
    setExperienceMax,
    offset,
    setOffset,
    candidateId,
    setCandidateId,
    offer,
    setOffer,
    busy,
    filtersOpen,
    setFiltersOpen,
    setReferenceNeedId,
    needs,
    filterError,
    selectedNeed,
    needId,
    remote,
    change,
    reset,
    recommendations,
    bank,
    busyChanged,
  };
};
