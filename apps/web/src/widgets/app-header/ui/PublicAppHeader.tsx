'use client';

import { useClientSession, useLastKnownRole } from '@/entities/session';

import { AppHeaderView } from './AppHeaderView';

/**
 * Шапка публичных страниц (лендинг, справочник, документы): сессия проверяется
 * в браузере, поэтому сами страницы остаются статичными (SSG/ISR).
 */
export const PublicAppHeader = () => {
  const session = useClientSession();
  const roleHint = useLastKnownRole();
  return (
    <AppHeaderView
      session={session ?? { kind: 'guest' }}
      pending={!session}
      roleHint={roleHint}
    />
  );
};
