'use client';

import { type ReactNode, useEffect } from 'react';

import { ensureClientAccessToken } from '@/shared/api';
import { onSessionExpired } from '@/shared/auth';

export const AuthBootstrap = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    void ensureClientAccessToken();
    return onSessionExpired(() => {
      // TODO: redirect to /login when auth pages exist
    });
  }, []);

  return children;
};
