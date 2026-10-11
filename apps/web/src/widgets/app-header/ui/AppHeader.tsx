import { loadSession } from '@/entities/session/api/server';

import { AppHeaderView } from './AppHeaderView';

/** Шапка кабинетов: сессия читается на сервере (SSR). */
export const AppHeader = async () => {
  const session = await loadSession();
  return <AppHeaderView session={session} />;
};
