import 'server-only';

import { ApiError } from '@/shared/api/errors';
import { getTokenDisplayName } from '@/shared/auth/server';
import { getAccessToken } from '@/shared/auth/session.server';

import type { SessionUser } from '../model';
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
    return {
      kind: 'user',
      user: { ...user, name: getTokenDisplayName(token) },
    };
  } catch (error) {
    if (!(error instanceof ApiError)) {
      return { kind: 'error', message: 'Не удалось проверить сессию' };
    }
    if (error.code === 'unauthorized') {
      return { kind: 'error', message: 'Сессия недействительна' };
    }
    return { kind: 'error', message: `${error.code}: ${error.message}` };
  }
};
