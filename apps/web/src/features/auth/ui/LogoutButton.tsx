'use client';

import { useState } from 'react';

import { confirmUnsavedChanges } from '@/shared/hooks';
import { Button } from '@/shared/ui';

import { logoutSession } from '../api';

interface LogoutButtonProps {
  className?: string;
}

export const LogoutButton = ({ className }: LogoutButtonProps) => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogout = async () => {
    if (pending || !confirmUnsavedChanges()) return;
    setPending(true);
    setError(null);

    try {
      await logoutSession();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Не удалось выйти');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className={className}
        disabled={pending}
        onClick={() => void onLogout()}
      >
        {pending ? 'Выход…' : 'Выйти'}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};
