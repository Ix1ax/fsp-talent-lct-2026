'use client';

import { useEffect, type ReactNode } from 'react';
import { ensureClientAccessToken } from '@/shared/api';
import { onSessionExpired } from '@/shared/auth';

/**
 * Hydrates in-memory access token once on mount (avoids first-request 401→refresh).
 * Guests stay silent — no session-expired event without an active session.
 */
export const AuthBootstrap = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    void ensureClientAccessToken();
    return onSessionExpired(() => {
      // TODO: redirect to /login when auth pages exist
    });
  }, []);

  return children;
};

