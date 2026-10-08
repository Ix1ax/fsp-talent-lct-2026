import { useState } from 'react';

import { Button } from '@/shared/ui';
import {
  type AdminAccount,
  adminRequest,
  adminSchemas,
} from '@/entities/admin';

import { useAdminSession } from '../model';
import { AdminConfirmDialog } from './AdminConfirmDialog';

interface AccountStatusActionProps {
  account: AdminAccount;
  onSaved: () => void;
}
export const AccountStatusAction = ({
  account,
  onSaved,
}: AccountStatusActionProps) => {
  const { session } = useAdminSession();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  if (
    !session ||
    session.admin.role !== 'superadmin' ||
    account.role === 'superadmin' ||
    account.id === session.admin.id
  )
    return null;
  const blocking = account.status === 'active';
  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await adminRequest(
        session.access_token,
        `/admins/${account.id}`,
        adminSchemas.account,
        { method: 'PATCH', body: { status: blocking ? 'blocked' : 'active' } },
      );
      setConfirming(false);
      onSaved();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="min-h-11"
        onClick={() => setConfirming(true)}
      >
        {blocking ? 'Заблокировать' : 'Включить'}
      </Button>
      {confirming && (
        <AdminConfirmDialog
          title={blocking ? 'Заблокировать аккаунт?' : 'Включить аккаунт?'}
          description={
            blocking
              ? 'Все его сессии завершатся, вход будет запрещён.'
              : 'Администратору потребуется войти заново.'
          }
          busy={busy}
          error={error}
          destructive={blocking}
          onConfirm={save}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  );
};
