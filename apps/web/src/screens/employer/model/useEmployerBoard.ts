'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { EmployerNeed, NeedStatus } from '@/entities/employer-need';
import { useCompanyActions } from '@/features/company';
import { useNeedActions } from '@/features/employer-need';

import { type EmployerGateway, employerGateway } from '../lib/gateway';
import { getEmployerLocationState } from './getEmployerLocationState';
import {
  loadEmployerCompanies,
  useEmployerResources,
} from './useEmployerResources';
import { useNeedsQuery } from './useNeedsQuery';
export const useEmployerBoard = (
  gateway: EmployerGateway = employerGateway,
) => {
  const resources = useEmployerResources(gateway);
  const refreshController = useRef<AbortController | null>(null);
  useEffect(() => () => refreshController.current?.abort(), [gateway]);
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
      syncQuery({
        status: next.status,
        selectedId: next.id,
        offset: next.status !== status || next.id !== selectedId ? 0 : offset,
      });
      setStatus(next.status);
      setSelectedId(next.id);
      setRevision((v) => v + 1);
    },
    onArchived: () => {
      setOffset(0);
      syncQuery({ status: 'archived', offset: 0 });
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
      `${window.location.pathname}?${query}`,
    );
  };
  const chooseCompany = (id: string) => {
    syncQuery({ companyId: id, selectedId: '', offset: 0 });
    setCompanyId(id);
    setSelectedId('');
    setOffset(0);
    clearError();
  };
  const chooseStatus = (tab: NeedStatus) => {
    syncQuery({ status: tab, selectedId: '', offset: 0 });
    setStatus(tab);
    setSelectedId('');
    setOffset(0);
    clearError();
  };
  const select = (id: string) => {
    syncQuery({ selectedId: id });
    setSelectedId(id);
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
        companies[0]?.id ??
        '';
      if (nextId !== companyId) {
        setSelectedId('');
        setOffset(0);
      }
      syncQuery({
        companyId: nextId,
        ...(nextId !== companyId ? { selectedId: '', offset: 0 } : {}),
      });
      setCompanyId(nextId);
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
      setStatus(need.status);
      setOffset(0);
      setSelectedId(need.id);
      clearError();
    },
    reload,
    page: (next: number) => {
      syncQuery({ offset: next, selectedId: '' });
      setOffset(next);
      setSelectedId('');
    },
    clearError,
  };
};

export type EmployerBoard = ReturnType<typeof useEmployerBoard>;
