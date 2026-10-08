import { useState } from 'react';

import { Button } from '@/shared/ui';
import {
  type AdminAccount,
  adminRequest,
  adminSchemas,
} from '@/entities/admin';

import { useAdminSession } from '../model';
import { ErrorNotice } from './Common';

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
    <div className="grid gap-2">
      <ErrorNotice error={error} />
      {confirming ? (
        <>
          <p className="max-w-sm text-sm">
            {blocking
              ? 'Заблокировать аккаунт? Все его сессии завершатся, вход будет запрещён.'
              : 'Включить аккаунт? Администратору потребуется войти заново.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => void save()}>
              {busy ? 'Сохраняем…' : 'Подтвердить'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Отмена
            </Button>
          </div>
        </>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
          {blocking ? 'Заблокировать' : 'Включить'}
        </Button>
      )}
    </div>
  );
};
