'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button, Card } from '@/shared/ui';
import { adminSchemas } from '@/entities/admin';
import {
  AccountEditor,
  ErrorNotice,
  Pagination,
  Status,
  useAdminQuery,
  useAdminSession,
} from '@/features/admin';

import { AdminPageHeader } from './AdminPageHeader';

export const AccountsPage = () => {
  const { session } = useAdminSession();
  const [offset, setOffset] = useState(0);
  const [creating, setCreating] = useState(false);
  const allowed = session?.admin.role === 'superadmin';
  const list = useAdminQuery(
    allowed ? `/admins?limit=20&offset=${offset}` : null,
    adminSchemas.accounts,
  );
  if (!allowed)
    return (
      <p role="alert">
        Управление администраторами доступно только главному администратору.
      </p>
    );
  return (
    <div className="grid content-start gap-6">
      <AdminPageHeader
        title="Администраторы"
        description="Аккаунты для управления платформой."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus />
            Добавить администратора
          </Button>
        }
      />
      <Card className="gap-5 p-4 sm:p-6">
        <ErrorNotice error={list.error} />
        {list.loading && <p role="status">Загружаем аккаунты…</p>}
        {list.data?.items.map((account) => (
          <div
            key={account.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b py-4"
          >
            <div>
              <p className="font-medium">{account.email}</p>
              <p className="mt-1 text-xs text-caption">
                {account.role === 'superadmin'
                  ? 'Главный администратор'
                  : 'Администратор'}{' '}
                · {new Date(account.created_at).toLocaleDateString('ru-RU')}
              </p>
            </div>
            <Status value={account.status} />
          </div>
        ))}
        <Pagination
          offset={offset}
          count={list.data?.items.length ?? 0}
          loading={list.loading}
          onChange={setOffset}
        />
      </Card>
      {creating && (
        <AccountEditor
          onClose={() => setCreating(false)}
          onSaved={list.reload}
        />
      )}
    </div>
  );
};
