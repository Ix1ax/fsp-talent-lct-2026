import { useCallback, useEffect, useState } from 'react';
import type { z } from 'zod';

import { adminRequest, type AdminSession } from '@/entities/admin';

import { useAdminSession } from './index';

export const useAdminQuery = <T>(path: string | null, schema: z.ZodType<T>) => {
  const { session } = useAdminSession();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    path: string;
    revision: number;
    session: AdminSession;
    data: T | null;
    error: unknown;
  } | null>(null);
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    if (!path || !session) return;
    const controller = new AbortController();
    void adminRequest(session.access_token, path, schema, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted)
          setResult({ path, revision, session, data, error: null });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult({ path, revision, session, data: null, error });
      });
    return () => controller.abort();
  }, [path, revision, schema, session]);
  const current =
    result?.path === path &&
    result?.revision === revision &&
    result?.session === session
      ? result
      : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: !!path && !!session && !current,
    reload,
  };
};
