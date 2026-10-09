import { useState } from 'react';
import Link from 'next/link';

import { Button } from '@/shared/ui';
import { adminUserSchema } from '@/entities/admin';
import {
  AdminPanel,
  type OperationDecision,
  OperationDecisionDialog,
  OperationStatus,
  useAdminQuery,
  useAdminSession,
  userRoleLabels,
} from '@/features/admin';

import { adminDate } from '../lib';
import { DetailFields, OperationDetailsLayout } from './OperationDetailsLayout';

export const UserDetails = ({ id }: { id: string }) => {
  const query = useAdminQuery(`/users/${id}`, adminUserSchema);
  const user = query.data;
  const { session } = useAdminSession();
  const [decision, setDecision] = useState<OperationDecision | null>(null);
  const allowed =
    user &&
    user.status !== 'deleted' &&
    (user.role !== 'admin' || session?.admin.role === 'superadmin');
  const choose = () => {
    if (!user || !allowed) return;
    const blocking = user.status === 'active';
    setDecision({
      kind: 'users',
      id,
      status: blocking ? 'blocked' : 'active',
      title: blocking
        ? 'Заблокировать пользователя'
        : 'Разблокировать пользователя',
      description: blocking
        ? 'Пользователь потеряет доступ к платформе. Профиль, результаты и предложения сохранятся.'
        : 'Доступ к платформе будет восстановлен. Укажите причину разблокировки.',
    });
  };
  return (
    <OperationDetailsLayout
      section="users"
      title={user ? userRoleLabels[user.role] : undefined}
      hasData={!!user}
      loading={query.loading}
      error={query.error}
      onReload={query.reload}
    >
      {user && (
        <AdminPanel>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-medium">Данные пользователя</h2>
            <OperationStatus value={user.status} />
          </div>
          <DetailFields
            fields={[
              { label: 'ID пользователя', value: user.id },
              { label: 'Роль', value: userRoleLabels[user.role] },
              { label: 'Создан', value: adminDate(user.created_at) },
              { label: 'Обновлён', value: adminDate(user.updated_at) },
              {
                label: 'ID профиля кандидата',
                value: user.candidate_profile_id,
              },
              {
                label: 'Поиск работы',
                value: user.search_status
                  ? {
                      open: 'Ищет работу',
                      passive: 'Рассматривает предложения',
                      hidden: 'Профиль скрыт',
                    }[user.search_status]
                  : null,
              },
            ]}
          />
          {user.status === 'deleted' && (
            <p className="text-sm text-muted-foreground">
              Удалённого пользователя нельзя восстановить через админку.
            </p>
          )}
          {user.role === 'admin' && session?.admin.role !== 'superadmin' && (
            <p className="text-sm text-muted-foreground">
              Статус пользователя с ролью администратора меняет только главный
              администратор.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {allowed && (
              <Button
                variant={user.status === 'active' ? 'destructive' : 'default'}
                onClick={choose}
              >
                {user.status === 'active' ? 'Заблокировать' : 'Разблокировать'}
              </Button>
            )}
            {user.candidate_profile_id && (
              <>
                {[
                  ['offers', 'Предложения кандидату'],
                  ['attempts', 'Попытки тестирования'],
                ].map(([section, label]) => (
                  <Button key={section} variant="outline" asChild>
                    <Link
                      href={`/admin/${section}?candidate_id=${user.candidate_profile_id}`}
                    >
                      {label}
                    </Link>
                  </Button>
                ))}
              </>
            )}
            <Button variant="outline" asChild>
              <Link href={`/admin/audit?entity_id=${id}`}>История статуса</Link>
            </Button>
          </div>
        </AdminPanel>
      )}
      {decision && (
        <OperationDecisionDialog
          decision={decision}
          onClose={() => setDecision(null)}
          onSaved={query.reload}
          onRefresh={query.reload}
        />
      )}
    </OperationDetailsLayout>
  );
};
