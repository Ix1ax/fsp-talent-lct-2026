import type { AdminSession } from '@/entities/admin';

export type AdminQueryResult<T> = {
  path: string;
  revision: number;
  session: AdminSession;
  data: T | null;
  error: unknown;
};
export const getAdminQueryState = <T>(
  result: AdminQueryResult<T> | null,
  path: string | null,
  revision: number,
  session: AdminSession | null,
) => {
  const sameResource =
    !!result && result.path === path && result.session === session;
  const current = sameResource && result.revision === revision;
  return {
    data: sameResource ? result.data : null,
    error: current ? result.error : null,
    loading: !!path && !!session && !current,
  };
};
