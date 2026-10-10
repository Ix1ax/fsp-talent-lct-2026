'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button, Card, StaggerItem } from '@/shared/ui';
import { adminSchemas } from '@/entities/admin';
import {
  AccountEditor,
  AccountStatusAction,
  AdminAnimatedList,
  AdminListLoading,
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
    <div className="grid min-w-0 content-start gap-6">
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
      <Card className="relative min-w-0 gap-4 p-4 sm:p-6">
        <ErrorNotice error={list.error} onRetry={list.reload} />
        <p role="status" aria-live="polite" className="sr-only">
          {list.loading ? 'Загружаем аккаунты…' : ''}
        </p>
        <div>
          <AdminListLoading loading={list.loading} hasData={!!list.data} />
          {!list.loading && !list.error && !list.data?.items.length && (
            <p className="py-6 text-center text-muted-foreground">
              Администраторов не найдено
            </p>
          )}
          <AdminAnimatedList>
            {list.data?.items.map((account) => (
              <StaggerItem
                key={account.id}
                className="grid min-w-0 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0 wrap-anywhere">
                  <p className="font-medium wrap-anywhere">{account.email}</p>
                  <p className="mt-1 text-xs text-caption">
                    {account.role === 'superadmin'
                      ? 'Главный администратор'
                      : 'Администратор'}{' '}
                    · {new Date(account.created_at).toLocaleDateString('ru-RU')}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    ID:{' '}
                    <span className="font-mono select-all">{account.id}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Status value={account.status} />
                  <AccountStatusAction
                    account={account}
                    onSaved={list.reload}
                  />
                </div>
              </StaggerItem>
            ))}
          </AdminAnimatedList>
        </div>
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
