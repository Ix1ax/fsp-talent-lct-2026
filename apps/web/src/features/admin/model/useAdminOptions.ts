import { useCallback, useEffect, useState } from 'react';

import {
  type AdminSession,
  type CatalogItem,
  type CatalogKind,
  getAdminCatalogs,
} from '@/entities/admin';

import { useAdminSession } from './index';

type OptionsResult = {
  session: AdminSession;
  revision: number;
  data: Record<string, CatalogItem[]>;
  error: unknown;
};
export const useAdminOptions = () => {
  const { session } = useAdminSession();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<OptionsResult | null>(null);
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    const load = async (kind: CatalogKind) => {
      const items: CatalogItem[] = [];
      for (let offset = 0; offset <= 10000; offset += 100) {
        const page = await getAdminCatalogs(
          session.access_token,
          kind,
          { limit: 100, offset },
          controller.signal,
        );
        items.push(...page.items);
        if (page.items.length < 100) break;
      }
      return items;
    };
    void Promise.all(
      ['skills', 'specializations', 'grades'].map(
        async (kind) => [kind, await load(kind as CatalogKind)] as const,
      ),
    )
      .then((entries) => {
        if (!controller.signal.aborted)
          setResult({
            session,
            revision,
            data: Object.fromEntries(entries),
            error: null,
          });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult((previous) => ({
            session,
            revision,
            data: previous?.session === session ? previous.data : {},
            error,
          }));
      });
    return () => controller.abort();
  }, [revision, session]);
  const current =
    result?.session === session && result?.revision === revision
      ? result
      : null;
  const data = result?.session === session ? result.data : {};
  return {
    data,
    error: current?.error ?? null,
    loading: !!session && !current,
    reload,
    skills: (data.skills ?? []).filter(
      (s) => s.active !== false && s.moderation_status === 'approved',
    ),
  };
};
