import { useCallback, useEffect, useState } from 'react';
import type { z } from 'zod';

import { adminRequest } from '@/entities/admin';

import { useAdminSession } from './AdminProvider';
import {
  type AdminQueryResult,
  getAdminQueryState,
} from './getAdminQueryState';

export const useAdminQuery = <T>(path: string | null, schema: z.ZodType<T>) => {
  const { session } = useAdminSession();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<AdminQueryResult<T> | null>(null);
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
          setResult((previous) => ({
            path,
            revision,
            session,
            data:
              previous?.path === path && previous.session === session
                ? previous.data
                : null,
            error,
          }));
      });
    return () => controller.abort();
  }, [path, revision, schema, session]);
  return {
    ...getAdminQueryState(result, path, revision, session),
    reload,
  };
};
