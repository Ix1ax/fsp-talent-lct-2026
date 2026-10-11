import { useCallback, useEffect, useState } from 'react';

import {
  type CatalogItem,
  type CatalogKind,
  invalidateAdminCatalogs,
  loadAdminCatalog,
  subscribeAdminCatalogs,
} from '@/entities/admin';

import { useAdminSession } from './AdminProvider';

type CatalogState = {
  token: string;
  revision: number;
  data: CatalogItem[];
  loading: boolean;
  error: unknown;
};
// Skills use bounded server search in SkillPicker, never a complete download.
type OptionKind = Exclude<CatalogKind, 'skills'>;
export const useAdminOptions = (kinds: readonly OptionKind[]) => {
  const { session } = useAdminSession();
  const token = session?.access_token;
  const key = [...new Set(kinds)].sort().join(',');
  const [revisions, setRevisions] = useState<
    Partial<Record<OptionKind, number>>
  >({});
  const [states, setStates] = useState<
    Partial<Record<OptionKind, CatalogState>>
  >({});
  useEffect(
    () =>
      subscribeAdminCatalogs((kind) => {
        if (!kind || key.split(',').includes(kind))
          setRevisions((previous) => {
            const next = { ...previous };
            for (const requested of key
              .split(',')
              .filter(Boolean) as OptionKind[]) {
              if (!kind || requested === kind)
                next[requested] = (previous[requested] ?? 0) + 1;
            }
            return next;
          });
      }),
    [key],
  );
  const reload = useCallback(
    (only?: OptionKind) => {
      for (const kind of key.split(',').filter(Boolean))
        if (!only || kind === only) invalidateAdminCatalogs(kind as OptionKind);
    },
    [key],
  );
  useEffect(() => {
    if (!token || !key) return;
    const controller = new AbortController();
    for (const kind of key.split(',') as OptionKind[]) {
      const revision = revisions[kind] ?? 0;
      void loadAdminCatalog(token, kind, controller.signal).then(
        (data) => {
          if (!controller.signal.aborted)
            setStates((previous) => ({
              ...previous,
              [kind]: { token, revision, data, loading: false, error: null },
            }));
        },
        (error: unknown) => {
          if (!controller.signal.aborted)
            setStates((previous) => ({
              ...previous,
              [kind]: { token, revision, data: [], loading: false, error },
            }));
        },
      );
    }
    return () => controller.abort();
  }, [key, token, revisions]);
  const data: Record<string, CatalogItem[]> = {};
  const catalogs: Partial<
    Record<OptionKind, Omit<CatalogState, 'token' | 'revision'>>
  > = {};
  for (const kind of key.split(',').filter(Boolean) as OptionKind[]) {
    const revision = revisions[kind] ?? 0;
    const current =
      states[kind]?.token === token && states[kind]?.revision === revision
        ? states[kind]
        : undefined;
    catalogs[kind] = current ?? { data: [], loading: !!token, error: null };
    data[kind] = catalogs[kind]!.data;
  }
  return {
    data,
    catalogs,
    loading: Object.values(catalogs).some((state) => state.loading),
    reload,
  };
};
