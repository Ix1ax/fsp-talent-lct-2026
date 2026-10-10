import type { SessionUser } from './types';

export type SessionState =
  | { kind: 'guest' }
  | { kind: 'user'; user: SessionUser }
  | {
      kind: 'invalid';
      reason: 'unauthorized' | 'forbidden' | 'token_expired';
      message: string;
      hasRefreshToken?: boolean;
    }
  | {
      kind: 'unavailable';
      message: string;
      code: string;
      status: number;
      displayName?: string;
      retryAfter?: string;
    };
