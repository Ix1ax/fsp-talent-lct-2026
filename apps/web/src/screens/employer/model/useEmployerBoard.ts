'use client';
import { useCallback, useEffect, useState } from 'react';

import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';
import type { Catalogs, Skill } from '@/entities/catalog';
import type { Company } from '@/entities/company';
import type { EmployerNeed, NeedStatus } from '@/entities/employer-need';
import { useCompanyActions } from '@/features/company';
import { useNeedActions } from '@/features/employer-need';

import { employerGateway } from '../lib/gateway';
import { useNeedsQuery } from './useNeedsQuery';
interface Resources {
  companies: Company[];
  catalogs: Catalogs;
  skills: Skill[];
}
export const useEmployerBoard = () => {
  const gateway = employerGateway;
  const [resources, setResources] = useState<Resources | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [companyId, setCompanyId] = useState('');
  const [status, setStatus] = useState<NeedStatus>('active');
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      await gateway.authorize();
      const [catalogs, skills] = await Promise.all([
        gateway.catalogs(controller.signal),
        gateway.skills('', controller.signal),
      ]);
      const companies: Company[] = [];
      for (let skip = 0; skip <= 10000; skip += 100) {
        const page = await gateway.companies(skip, controller.signal);
        companies.push(...page.items);
        if (page.items.length < 100) break;
      }
      if (controller.signal.aborted) return;
      const query = new URLSearchParams(window.location.search);
      setResources({ companies, catalogs, skills });
      setCompanyId(
        companies.find((c) => c.id === query.get('company'))?.id ??
          companies[0]?.id ??
          '',
      );
      const pageOffset = Number(query.get('offset') ?? 0);
      setOffset(
        Number.isInteger(pageOffset) && pageOffset >= 0 && pageOffset <= 10000
          ? pageOffset
          : 0,
      );
      const tab = query.get('tab');
      setStatus(tab === 'draft' || tab === 'archived' ? tab : 'active');
      const needId = query.get('need') ?? '';
      setSelectedId(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(needId) ? needId : '');
    })().catch((e) => {
      if (!controller.signal.aborted) {
        setError(getApiErrorMessage(e));
      }
    });
    return () => controller.abort();
  }, [gateway, retry]);
  const query = useNeedsQuery({
    api: gateway,
    companyId,
    status,
    offset,
    selectedId,
    revision,
    enabled: !!resources,
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
    company: resources?.companies.find((c) => c.id === companyId) ?? null,
    onSaved: (company, created) => {
      setResources((r) =>
        r
          ? {
              ...r,
              companies: created
                ? [...r.companies, company]
                : r.companies.map((c) => (c.id === company.id ? company : c)),
            }
          : r,
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
      const companies: Company[] = [];
      for (let skip = 0; skip <= 10000; skip += 100) {
        const page = await gateway.companies(skip);
        companies.push(...page.items);
        if (page.items.length < 100) break;
      }
      setResources((r) => (r ? { ...r, companies } : r));
      const nextId =
        companies.find((c) => c.id === preferredId)?.id ??
        companies[0]?.id ??
        '';
      if (nextId !== companyId) {
        setSelectedId('');
        setOffset(0);
      }
      setCompanyId(nextId);
      setRevision((v) => v + 1);
    },
    resources,
    error,
    retry: () => {
      setResources(null);
      setError('');
      setRetry((v) => v + 1);
      setRevision((v) => v + 1);
    },
    company: resources?.companies.find((c) => c.id === companyId) ?? null,
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
