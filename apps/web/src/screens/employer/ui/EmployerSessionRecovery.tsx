'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2Icon } from 'lucide-react';

import { ensureClientAccessToken } from '@/shared/api';
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';
import { clearClientAccessToken } from '@/shared/auth';
import { STATIC_ROUTES } from '@/shared/contants';
import { AsyncState } from '@/shared/ui';

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
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setSlow(true), 4000);
    return () => window.clearTimeout(timer);
  }, [pending]);
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
            `${STATIC_ROUTES.LOGIN}?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
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
    // По центру экрана: это промежуточное состояние перед кабинетом.
    <main className="mx-auto grid min-h-[70svh] w-full max-w-2xl content-center gap-4 px-4 py-12 sm:px-6">
      {pending ? (
        <div
          role="status"
          aria-label="Обновление сессии"
          className="grid gap-4"
        >
          <Loader2Icon
            aria-hidden="true"
            className="mx-auto size-6 animate-spin text-brand-text"
          />
          <p className="text-center text-muted-foreground">Обновляем сессию…</p>
          {slow && (
            <p className="text-center text-sm text-muted-foreground">
              Сервис авторизации отвечает дольше обычного. Если соединение не
              восстановится, появится кнопка повтора.
            </p>
          )}
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
            if (message) {
              window.location.reload();
              return;
            }
            setSlow(false);
            setPending(true);
            setError('');
            void recover();
          }}
        />
      )}
    </main>
  );
};
