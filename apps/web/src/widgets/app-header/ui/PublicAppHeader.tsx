'use client';

import { useClientSession } from '@/entities/session';

import { AppHeaderView } from './AppHeaderView';

/**
 * Шапка публичных страниц (лендинг, справочник, документы): сессия проверяется
 * в браузере, поэтому сами страницы остаются статичными (SSG/ISR).
 */
export const PublicAppHeader = () => {
  const session = useClientSession();
  return (
    <AppHeaderView session={session ?? { kind: 'guest' }} pending={!session} />
  );
};
