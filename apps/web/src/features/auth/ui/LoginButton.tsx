'use client';

import { useState } from 'react';

import { Button } from '@/shared/ui';

import { startOidcLogin } from '../api';

type LoginButtonProps = {
  className?: string;
};

export const LoginButton = ({ className }: LoginButtonProps) => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogin = async () => {
    setPending(true);
    setError(null);

    try {
      await startOidcLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
      setPending(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        className={className}
        disabled={pending}
        onClick={() => void onLogin()}
      >
        {pending ? 'Перенаправление…' : 'Войти через Keycloak'}
      </Button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
