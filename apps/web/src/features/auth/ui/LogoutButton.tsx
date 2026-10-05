'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { clearClientAccessToken } from '@/shared/auth';
import { Button } from '@/shared/ui/Button';

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const onLogout = async () => {
    setPending(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      clearClientAccessToken();
      router.push('/');
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      disabled={pending}
      onClick={() => void onLogout()}
    >
      {pending ? 'Выход…' : 'Выйти'}
    </Button>
  );
}
