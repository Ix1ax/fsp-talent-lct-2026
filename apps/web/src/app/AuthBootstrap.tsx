'use client';

import { type ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { ensureClientAccessToken } from '@/shared/api';
import { onSessionExpired } from '@/shared/auth';
import { STATIC_ROUTES } from '@/shared/contants';

export const AuthBootstrap = ({ children }: { children: ReactNode }) => {
  const router = useRouter();

  useEffect(() => {
    void ensureClientAccessToken();

    return onSessionExpired(() => {
      router.push(STATIC_ROUTES.LOGIN);
    });
  }, [router]);

  return children;
};
