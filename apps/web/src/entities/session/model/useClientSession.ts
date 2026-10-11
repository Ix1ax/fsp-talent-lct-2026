'use client';

import { useEffect, useState } from 'react';

import { ensureClientAccessToken } from '@/shared/api';
import { getTokenDisplayName } from '@/shared/auth/getTokenDisplayName';

import { getMeClient } from '../api';
import type { SessionState } from './sessionState';

/**
 * Сессия на стороне браузера для статичных страниц: токен обновляется по
 * httpOnly-cookie, затем запрашивается /v1/me. null — проверка ещё идёт.
 */
// Один запрос на загрузку страницы: шапка и лендинг используют общий результат.
let sessionRequest: Promise<SessionState> | null = null;

const loadClientSession = async (): Promise<SessionState> => {
  const token = await ensureClientAccessToken();
  if (!token) return { kind: 'guest' };
  const user = await getMeClient();
  return { kind: 'user', user: { ...user, name: getTokenDisplayName(token) } };
};

export const useClientSession = (): SessionState | null => {
  const [session, setSession] = useState<SessionState | null>(null);

  useEffect(() => {
    let active = true;
    sessionRequest ??= loadClientSession().catch((): SessionState => ({
      kind: 'guest',
    }));
    sessionRequest.then((next) => {
      if (active) setSession(next);
    });
    return () => {
      active = false;
    };
  }, []);

  return session;
};
