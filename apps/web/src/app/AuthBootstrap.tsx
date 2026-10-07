'use client';

import { type ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { ensureClientAccessToken } from '@/shared/api';
import { clearOidcUser, onSessionExpired } from '@/shared/auth';
import { STATIC_ROUTES } from '@/shared/contants';

interface AuthBootstrapProps {
  children: ReactNode;
}

export const AuthBootstrap = ({ children }: AuthBootstrapProps) => {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/demo/employer') return;
    if (pathname !== '/auth/callback') {
      void clearOidcUser().then(() => ensureClientAccessToken());
    }

    return onSessionExpired(() => {
      router.push(STATIC_ROUTES.LOGIN);
    });
  }, [pathname, router]);

  return children;
};
