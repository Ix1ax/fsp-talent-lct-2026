'use client';

import { Button } from '@/shared/ui';
import { AdminLoginForm, ErrorNotice } from '@/features/admin';

interface AdminSessionStateProps {
  loading: boolean;
  error: unknown;
  hasSession: boolean;
  onRetry: () => void;
  onReturnToLogin: () => void;
}

export const AdminSessionState = ({
  loading,
  error,
  hasSession,
  onRetry,
  onReturnToLogin,
}: AdminSessionStateProps) => {
  if (loading)
    return (
      <div
        className="grid min-h-screen place-items-center text-muted-foreground"
        role="status"
      >
        Проверяем сессию…
      </div>
    );

  if (error && !hasSession)
    return (
      <div className="mx-auto grid max-w-lg gap-4 p-8">
        <ErrorNotice error={error} />
        <Button onClick={onRetry}>Повторить проверку сессии</Button>
        <Button variant="outline" onClick={onReturnToLogin}>
          Перейти ко входу
        </Button>
      </div>
    );

  if (!hasSession) return <AdminLoginForm />;

  return null;
};
