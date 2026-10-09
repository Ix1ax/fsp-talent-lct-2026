import { useEffect, useState } from 'react';

import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';
import type { Catalogs } from '@/entities/catalog';
import type { Company } from '@/entities/company';

import type { EmployerGateway } from '../lib/gateway';

type Resource<T> = {
  gateway: EmployerGateway;
  revision: number;
  data?: T;
  error: string;
};
export const EMPTY_EMPLOYER_CATALOGS: Catalogs = {
  specializations: [],
  grades: [],
  workFormats: [],
};

export const loadEmployerCompanies = async (
  gateway: EmployerGateway,
  signal: AbortSignal,
) => {
  const companies: Company[] = [];
  for (let offset = 0; offset <= 10000; offset += 100) {
    const page = await gateway.companies(offset, signal);
    signal.throwIfAborted();
    companies.push(...page.items);
    if (page.items.length < 100) return companies;
  }
  throw new Error(
    'Достигнут предел загрузки компаний. Полный список недоступен.',
  );
};

export const useEmployerResources = (gateway: EmployerGateway) => {
  const [authRevision, setAuthRevision] = useState(0);
  const [companiesRevision, setCompaniesRevision] = useState(0);
  const [catalogsRevision, setCatalogsRevision] = useState(0);
  const [auth, setAuth] = useState<Resource<boolean> | null>(null);
  const [companies, setCompanies] = useState<Resource<Company[]> | null>(null);
  const [catalogs, setCatalogs] = useState<Resource<Catalogs> | null>(null);
  const authorized =
    auth?.gateway === gateway && auth.revision === authRevision && auth.data;
  useEffect(() => {
    let active = true;
    void gateway.authorize().then(
      () => {
        if (active)
          setAuth({ gateway, revision: authRevision, data: true, error: '' });
      },
      (error: unknown) => {
        if (active)
          setAuth({
            gateway,
            revision: authRevision,
            error: getApiErrorMessage(error),
          });
      },
    );
    return () => {
      active = false;
    };
  }, [gateway, authRevision]);
  // Both effects start in the same commit after authorization; neither waits for the other.
  useEffect(() => {
    if (!authorized) return;
    const controller = new AbortController();
    void loadEmployerCompanies(gateway, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted)
          setCompanies({
            gateway,
            revision: companiesRevision,
            data,
            error: '',
          });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setCompanies({
            gateway,
            revision: companiesRevision,
            error: getApiErrorMessage(error),
          });
      },
    );
    return () => controller.abort();
  }, [gateway, authorized, companiesRevision]);
  useEffect(() => {
    if (!authorized) return;
    const controller = new AbortController();
    void gateway.catalogs(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted)
          setCatalogs({ gateway, revision: catalogsRevision, data, error: '' });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setCatalogs({
            gateway,
            revision: catalogsRevision,
            error: getApiErrorMessage(error),
          });
      },
    );
    return () => controller.abort();
  }, [gateway, authorized, catalogsRevision]);
  const currentAuth =
    auth?.gateway === gateway && auth.revision === authRevision ? auth : null;
  const currentCompanies =
    authorized &&
    companies?.gateway === gateway &&
    companies.revision === companiesRevision
      ? companies
      : null;
  const currentCatalogs =
    authorized &&
    catalogs?.gateway === gateway &&
    catalogs.revision === catalogsRevision
      ? catalogs
      : null;
  return {
    companies: currentCompanies?.data ?? null,
    catalogs: currentCatalogs?.data ?? EMPTY_EMPLOYER_CATALOGS,
    catalogsLoading: !!authorized && !currentCatalogs,
    catalogsError: currentCatalogs?.error ?? '',
    error: currentAuth?.error || currentCompanies?.error || '',
    retry: () => {
      if (!authorized) setAuthRevision((value) => value + 1);
      else setCompaniesRevision((value) => value + 1);
    },
    retryCatalogs: () => setCatalogsRevision((value) => value + 1),
    updateCompanies: (update: (companies: Company[]) => Company[]) =>
      setCompanies((previous) =>
        previous?.data
          ? { ...previous, data: update(previous.data) }
          : previous,
      ),
  };
};
