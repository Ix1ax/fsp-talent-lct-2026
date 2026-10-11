'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import type { EmployerNeed, NeedStatus } from '@/entities/employer-need';
import { useCompanyActions } from '@/features/company';
import { useNeedActions } from '@/features/employer-need';

import {
  type EmployerGateway,
  employerGateway,
  getDefaultCompanyId,
} from '../lib';
import { getEmployerLocationState } from './getEmployerLocationState';
import {
  loadEmployerCompanies,
  useEmployerResources,
} from './useEmployerResources';
import { useNeedsQuery } from './useNeedsQuery';
export const useEmployerBoard = (
  gateway: EmployerGateway = employerGateway,
  needsEnabled = true,
) => {
  const resources = useEmployerResources(gateway);
  const refreshController = useRef<AbortController | null>(null);
  useEffect(() => () => refreshController.current?.abort(), [gateway]);
  const searchParams = useSearchParams();
  const location = getEmployerLocationState(searchParams.toString());
  const companyId =
    resources.companies?.find((company) => company.id === location.companyId)
      ?.id ?? getDefaultCompanyId(resources.companies);
  const { status, offset, selectedId } = location;
  const [revision, setRevision] = useState(0);
  const query = useNeedsQuery({
    api: gateway,
    companyId,
    status,
    offset,
    selectedId,
    revision,
    enabled: !!resources.companies && needsEnabled,
  });
  const needActions = useNeedActions({
    api: gateway,
    companyId,
    need: query.selected,
    onSaved: (next) => {
      syncQuery({
        status: next.status,
        selectedId: next.id,
        offset: next.status !== status || next.id !== selectedId ? 0 : offset,
      });
      setRevision((v) => v + 1);
    },
    onArchived: () => {
      syncQuery({ status: 'archived', offset: 0 });
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
      if (created)
        syncQuery({ companyId: company.id, selectedId: '', offset: 0 });
    },
  });
  const clearError = () => {
    needActions.clearError();
    companyActions.clearError();
  };
  const syncQuery = (next: {
    companyId?: string;
    status?: NeedStatus;
    offset?: number;
    selectedId?: string;
  }) => {
    const query = new URLSearchParams(window.location.search);
    const selectedCompany = next.companyId ?? companyId;
    if (selectedCompany) query.set('company', selectedCompany);
    else query.delete('company');
    query.set('tab', next.status ?? status);
    const pageOffset = next.offset ?? offset;
    if (pageOffset) query.set('offset', String(pageOffset));
    else query.delete('offset');
    const needId = next.selectedId ?? selectedId;
    if (needId) query.set('need', needId);
    else query.delete('need');
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}?${query}${window.location.hash}`,
    );
  };
  useEffect(() => {
    if (!companyId || location.companyId === companyId) return;
    const query = new URLSearchParams(window.location.search);
    query.set('company', companyId);
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}?${query}${window.location.hash}`,
    );
  }, [companyId, location.companyId]);
  const chooseCompany = (id: string) => {
    syncQuery({ companyId: id, selectedId: '', offset: 0 });
    clearError();
  };
  const chooseStatus = (tab: NeedStatus) => {
    syncQuery({ status: tab, selectedId: '', offset: 0 });
    clearError();
  };
  const select = (id: string) => {
    syncQuery({ selectedId: id });
    clearError();
  };
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  return {
    refreshCompanies: async (preferredId = companyId) => {
      refreshController.current?.abort();
      const controller = new AbortController();
      refreshController.current = controller;
      const companies = await loadEmployerCompanies(gateway, controller.signal);
      controller.signal.throwIfAborted();
      resources.updateCompanies(() => companies);
      const nextId =
        companies.find((company) => company.id === preferredId)?.id ??
        getDefaultCompanyId(companies);
      syncQuery({
        companyId: nextId,
        ...(nextId !== companyId ? { selectedId: '', offset: 0 } : {}),
      });
      setRevision((value) => value + 1);
    },
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
      syncQuery({ status: need.status, offset: 0, selectedId: need.id });
      clearError();
    },
    reload,
    page: (next: number) => {
      syncQuery({ offset: next, selectedId: '' });
    },
    clearError,
  };
};

export type EmployerBoard = ReturnType<typeof useEmployerBoard>;
