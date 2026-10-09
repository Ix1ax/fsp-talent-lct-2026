'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { ensureClientAccessToken } from '@/shared/api';
import {
  clearOidcUser,
  getClientSessionRevision,
  onSessionExpired,
} from '@/shared/auth';
import { STATIC_ROUTES } from '@/shared/contants';

interface AuthBootstrapProps {
  children: ReactNode;
}

type BootstrapAttempt = {
  promise: Promise<void>;
  failed: boolean;
  notified: boolean;
};

export const AuthBootstrap = ({ children }: AuthBootstrapProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const attempt = useRef<BootstrapAttempt | null>(null);
  const enabled =
    pathname !== '/demo/employer' &&
    !pathname.startsWith('/admin') &&
    pathname !== '/auth/callback';
  const subscribe =
    pathname !== '/demo/employer' && !pathname.startsWith('/admin');

  useEffect(() => {
    if (!subscribe) return;
    return onSessionExpired(() => router.push(STATIC_ROUTES.LOGIN));
  }, [subscribe, router]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const restore = (retry = false) => {
      if (!attempt.current || (retry && attempt.current.failed)) {
        const revision = getClientSessionRevision();
        const current: BootstrapAttempt = {
          failed: false,
          notified: false,
          promise: Promise.resolve(),
        };
        current.promise = clearOidcUser()
          .then(async () => {
            if (revision !== getClientSessionRevision()) return;
            await ensureClientAccessToken();
          })
          .catch((error: unknown) => {
            if (revision !== getClientSessionRevision()) return;
            if (error instanceof Error && error.name === 'AbortError') return;
            current.failed = true;
          });
        attempt.current = current;
      }
      const current = attempt.current;
      void current.promise.then(() => {
        if (active && current.failed && !current.notified) {
          current.notified = true;
          toast.warning(
            'Не удалось восстановить сессию. Проверьте подключение и обновите страницу.',
          );
        }
      });
    };
    restore();

    const online = () => restore(true);
    window.addEventListener('online', online);

    return () => {
      active = false;
      window.removeEventListener('online', online);
    };
  }, [enabled]);

  return children;
};
