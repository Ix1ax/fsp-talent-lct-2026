import 'server-only';

import { ApiError } from '@/shared/api';
import { getAccessToken } from '@/shared/auth/session.server';

import type { SessionUser } from '../model/types';
import { getMe } from './getMe';

export type SessionState =
  | { kind: 'guest' }
  | { kind: 'user'; user: SessionUser }
  | { kind: 'error'; message: string };

export const loadSession = async (): Promise<SessionState> => {
  const token = await getAccessToken();
  if (!token) return { kind: 'guest' };

  try {
    const user = await getMe();
    return { kind: 'user', user };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.code === 'unauthorized'
          ? 'Сессия недействительна'
          : `${error.code}: ${error.message}`
        : 'Не удалось проверить сессию';

    return { kind: 'error', message };
  }
};
