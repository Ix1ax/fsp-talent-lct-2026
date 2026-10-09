'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ensureClientAccessToken } from '@/shared/api';
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';
import { clearClientAccessToken } from '@/shared/auth';
import { AsyncState, Skeleton } from '@/shared/ui';

interface EmployerSessionRecoveryProps {
  message?: string;
}
export const EmployerSessionRecovery = ({
  message,
}: EmployerSessionRecoveryProps) => {
  const router = useRouter();
  const running = useRef(false);
  const [pending, setPending] = useState(!message);
  const [error, setError] = useState('');
  const recover = useCallback(() => {
    if (running.current) return;
    running.current = true;
    clearClientAccessToken();
    void ensureClientAccessToken()
      .then((token) => {
        // Replace the cached protected layout after refreshing the cookie.
        if (token) window.location.reload();
        else
          router.replace(
            `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
          );
      })
      .catch((failure: unknown) => {
        setError(getApiErrorMessage(failure));
        setPending(false);
      })
      .finally(() => {
        running.current = false;
      });
  }, [router]);
  useEffect(() => {
    if (!message) recover();
  }, [message, recover]);
  return (
    <main className="mx-auto grid w-full max-w-2xl gap-4 px-4 py-12 sm:px-6">
      {pending ? (
        <div
          role="status"
          aria-label="Обновление сессии"
          className="grid gap-4"
        >
          <p className="text-center text-muted-foreground">Обновляем сессию…</p>
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <AsyncState
          error
          title="Не удалось открыть кабинет"
          description={
            error ||
            message ||
            'Попробуйте ещё раз — данные компании сохраняются на сервере.'
          }
          onRetry={() => {
            setPending(true);
            setError('');
            void recover();
          }}
        />
      )}
    </main>
  );
};
