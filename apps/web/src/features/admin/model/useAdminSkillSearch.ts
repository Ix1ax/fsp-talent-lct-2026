import { useEffect, useState } from 'react';

import {
  type CatalogItem,
  getAdminCatalogs,
  getAdminSkill,
  subscribeAdminCatalogs,
} from '@/entities/admin';

import { useAdminSession } from './index';

type SearchResult = {
  token: string;
  query: string;
  revision: number;
  items: CatalogItem[];
  error: unknown;
};
type SelectedResult = {
  token: string;
  id: string;
  revision: number;
  item?: CatalogItem;
  error: unknown;
};
export const useAdminSkillSearch = (query: string, selectedId: string) => {
  const { session } = useAdminSession();
  const token = session?.access_token;
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [selected, setSelected] = useState<SelectedResult | null>(null);
  useEffect(
    () =>
      subscribeAdminCatalogs((kind) => {
        if (!kind || kind === 'skills') setRevision((value) => value + 1);
      }),
    [],
  );
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        void getAdminCatalogs(
          token,
          'skills',
          { q: query, limit: 50, offset: 0 },
          controller.signal,
        ).then(
          (page) => {
            if (!controller.signal.aborted)
              setResult({
                token,
                query,
                revision,
                items: page.items,
                error: null,
              });
          },
          (error: unknown) => {
            if (!controller.signal.aborted)
              setResult({ token, query, revision, items: [], error });
          },
        );
      },
      query ? 300 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [token, query, revision]);
  useEffect(() => {
    if (!token || !selectedId) return;
    const controller = new AbortController();
    void getAdminSkill(token, selectedId, controller.signal).then(
      (item) => {
        if (!controller.signal.aborted)
          setSelected({ token, id: selectedId, revision, item, error: null });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setSelected({ token, id: selectedId, revision, error });
      },
    );
    return () => controller.abort();
  }, [token, selectedId, revision]);
  const current =
    result &&
    result.token === token &&
    result.query === query &&
    result.revision === revision
      ? result
      : null;
  const currentSelected =
    selected &&
    selected.token === token &&
    selected.id === selectedId &&
    selected.revision === revision
      ? selected
      : null;
  return {
    items: current?.items ?? [],
    selected: currentSelected?.item,
    error: current?.error ?? currentSelected?.error ?? null,
    loading: !!token && !current,
    retry: () => setRevision((value) => value + 1),
  };
};
