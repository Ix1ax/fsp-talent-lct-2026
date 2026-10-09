'use client';
import { useCallback, useEffect, useState } from 'react';

import type { EmployerNeed, NeedStatus } from '@/entities/employer-need';
import { useCompanyActions } from '@/features/company';
import { useNeedActions } from '@/features/employer-need';

import { type EmployerGateway, employerGateway } from '../lib/gateway';
import { getEmployerLocationState } from './getEmployerLocationState';
import { useEmployerResources } from './useEmployerResources';
import { useNeedsQuery } from './useNeedsQuery';
export const useEmployerBoard = (
  gateway: EmployerGateway = employerGateway,
) => {
  const resources = useEmployerResources(gateway);
  const [initialLocation] = useState(() =>
    getEmployerLocationState(
      typeof window === 'undefined' ? '' : window.location.search,
    ),
  );
  const [requestedCompanyId, setCompanyId] = useState(
    initialLocation.companyId,
  );
  const companyId =
    resources.companies?.find((company) => company.id === requestedCompanyId)
      ?.id ??
    resources.companies?.[0]?.id ??
    '';
  const [status, setStatus] = useState<NeedStatus>(initialLocation.status);
  const [offset, setOffset] = useState(initialLocation.offset);
  const [selectedId, setSelectedId] = useState(initialLocation.selectedId);
  const [revision, setRevision] = useState(0);
  const query = useNeedsQuery({
    api: gateway,
    companyId,
    status,
    offset,
    selectedId,
    revision,
    enabled: !!resources.companies,
  });
  const needActions = useNeedActions({
    api: gateway,
    companyId,
    need: query.selected,
    onSaved: (next) => {
      if (next.status !== status || next.id !== selectedId) setOffset(0);
      setStatus(next.status);
      setSelectedId(next.id);
      setRevision((v) => v + 1);
    },
    onArchived: () => {
      setOffset(0);
      setStatus('archived');
      setRevision((v) => v + 1);
    },
  });
  const companyActions = useCompanyActions({
    api: gateway,
    company: resources.companies?.find((c) => c.id === companyId) ?? null,
    onSaved: (company, created) => {
      resources.updateCompanies((companies) =>
        created
          ? [...companies, company]
          : companies.map((current) =>
              current.id === company.id ? company : current,
            ),
      );
      if (created) {
        setCompanyId(company.id);
        setSelectedId('');
        setOffset(0);
      }
    },
  });
  const clearError = () => {
    needActions.clearError();
    companyActions.clearError();
  };
  useEffect(() => {
    if (!resources.companies || (resources.companies.length > 0 && !companyId))
      return;
    const query = new URLSearchParams(window.location.search);
    if (companyId) query.set('company', companyId);
    else query.delete('company');
    query.set('tab', status);
    if (offset) query.set('offset', String(offset));
    else query.delete('offset');
    if (selectedId) query.set('need', selectedId);
    else query.delete('need');
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}?${query}`,
    );
  }, [resources.companies, companyId, status, selectedId, offset]);
  const chooseCompany = (id: string) => {
    setCompanyId(id);
    setSelectedId('');
    setOffset(0);
    clearError();
  };
  const chooseStatus = (tab: NeedStatus) => {
    setStatus(tab);
    setSelectedId('');
    setOffset(0);
    clearError();
  };
  const select = (id: string) => {
    setSelectedId(id);
    clearError();
  };
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  return {
    resources: resources.companies ? { companies: resources.companies } : null,
    catalogs: resources.catalogs,
    catalogsLoading: resources.catalogsLoading,
    catalogsError: resources.catalogsError,
    retryCatalogs: resources.retryCatalogs,
    error: resources.error,
    retry: resources.retry,
    company: resources.companies?.find((c) => c.id === companyId) ?? null,
    companyId,
    status,
    offset,
    ...query,
    selectedId,
    pending: needActions.pending || companyActions.pending,
    saveError: needActions.error,
    companyError: companyActions.error,
    revision,
    save: needActions.save,
    archive: needActions.archive,
    restore: needActions.restore,
    duplicate: needActions.duplicate,
    saveCompany: companyActions.save,
    chooseCompany,
    chooseStatus,
    select,
    openNeed: (need: EmployerNeed) => {
      setStatus(need.status);
      setOffset(0);
      setSelectedId(need.id);
      clearError();
    },
    reload,
    page: (next: number) => {
      setOffset(next);
      setSelectedId('');
    },
    clearError,
  };
};

export type EmployerBoard = ReturnType<typeof useEmployerBoard>;
