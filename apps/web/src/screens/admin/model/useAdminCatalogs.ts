import { useCallback, useEffect, useState } from 'react';

import { useDebounce } from '@/shared/hooks';
import {
  type CatalogItem,
  type CatalogKind,
  getAdminCatalogs,
  invalidateAdminCatalogs,
  subscribeAdminCatalogs,
  updateAdminCatalogItem,
} from '@/entities/admin';
import { useAdminMutation, useAdminSession } from '@/features/admin';

export const useAdminCatalogs = () => {
  const { session } = useAdminSession();
  const [kind, setKind] = useState<CatalogKind>('specializations');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [editor, setEditor] = useState<CatalogItem | 'new' | null>(null);
  const [deleting, setDeleting] = useState<CatalogItem | null>(null);
  const { debounce, cancel } = useDebounce((value: string) => {
    setQ(value.trim());
    setOffset(0);
  }, 350);
  const [catalogs, setCatalogs] = useState<Awaited<
    ReturnType<typeof getAdminCatalogs>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => invalidateAdminCatalogs(kind), [kind]);
  useEffect(
    () =>
      subscribeAdminCatalogs((changed) => {
        if (!changed || changed === kind) setRevision((value) => value + 1);
      }),
    [kind],
  );
  const mutation = useAdminMutation(reload);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      setCatalogs(null);
      try {
        const data = await getAdminCatalogs(
          session.access_token,
          kind,
          { q, offset, limit: 20 },
          controller.signal,
        );
        if (!controller.signal.aborted) setCatalogs(data);
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [session, kind, q, offset, revision]);

  const toggle = (item: CatalogItem) =>
    void mutation.run(async () => {
      await updateAdminCatalogItem(session!.access_token, kind, item.id, {
        active: item.active === false,
      });
    });

  return {
    session,
    kind,
    setKind,
    search,
    setSearch,
    setQ,
    offset,
    setOffset,
    editor,
    setEditor,
    deleting,
    setDeleting,
    debounce,
    cancel,
    catalogs,
    loading,
    loadError,
    reload,
    mutation,
    toggle,
  };
};
