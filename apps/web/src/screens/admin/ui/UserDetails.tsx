import { useState } from 'react';
import Link from 'next/link';

import { Button } from '@/shared/ui';
import { adminUserSchema } from '@/entities/admin';
import {
  AdminBlockNotice,
  AdminPanel,
  adminUserLabel,
  type OperationDecision,
  OperationDecisionDialog,
  OperationStatus,
  useAdminQuery,
  useAdminSession,
  userRoleLabels,
} from '@/features/admin';

import { adminDate } from '../lib';
import { DetailFields, OperationDetailsLayout } from './OperationDetailsLayout';
import { UserCompanies } from './UserCompanies';

interface UserDetailsProps {
  id: string;
}

export const UserDetails = ({ id }: UserDetailsProps) => {
  const query = useAdminQuery(`/users/${id}`, adminUserSchema);
  const user = query.data;
  const [relatedRevision, setRelatedRevision] = useState(0);
  const refresh = () => {
    setRelatedRevision((value) => value + 1);
    query.reload();
  };
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
      subjectLabel: adminUserLabel(user),
      subjectEmail: user.email,
      id,
      status: blocking ? 'blocked' : 'active',
      title: blocking
        ? 'Заблокировать пользователя'
        : 'Разблокировать пользователя',
      description: blocking
        ? 'Аккаунт потеряет доступ ко всем рабочим действиям. Профиль, результаты и предложения сохранятся. Пользователь увидит указанную причину в своём кабинете. Блокировка работодателя не блокирует саму компанию и остальных участников.'
        : 'Доступ аккаунта будет восстановлен. Отдельные блокировки компаний сохранятся. Укажите причину разблокировки.',
    });
  };
  return (
    <OperationDetailsLayout
      section="users"
      title={user ? adminUserLabel(user) : undefined}
      hasData={!!user}
      loading={query.loading}
      error={query.error}
      onReload={refresh}
    >
      {user && (
        <>
          <AdminPanel>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-medium">Данные пользователя</h2>
              <OperationStatus value={user.status} />
            </div>
            {user.status === 'blocked' && (
              <AdminBlockNotice
                subject="user"
                reason={user.blocked_reason}
                date={adminDate(user.blocked_at)}
              />
            )}
            <DetailFields
              fields={[
                { label: 'ФИО', value: user.full_name },
                {
                  label: 'Источник имени',
                  value: user.full_name_source
                    ? {
                        candidate_contacts: 'Профиль кандидата',
                        identity: 'Аккаунт пользователя',
                      }[user.full_name_source]
                    : null,
                },
                { label: 'Почта аккаунта (подтверждена)', value: user.email },
                {
                  label: 'Контактная почта кандидата',
                  value: user.contact_email,
                },
                {
                  label: 'Данные аккаунта обновлены',
                  value: adminDate(user.identity_updated_at),
                },
                {
                  label: 'ID пользователя',
                  value: (
                    <span className="font-mono select-all">{user.id}</span>
                  ),
                },
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
            <p className="text-xs text-muted-foreground">
              Имя может менять сам пользователь. Блокировка привязана к ID
              аккаунта. Контактная почта кандидата указана им самостоятельно.
            </p>
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
                  disabled={query.loading || !!query.error}
                  onClick={choose}
                >
                  {user.status === 'active'
                    ? 'Заблокировать'
                    : 'Разблокировать'}
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
                <Link
                  href={`/admin/audit?entity_type=user&entity_id=${id}&action=user.status_changed`}
                >
                  История доступа
                </Link>
              </Button>
            </div>
          </AdminPanel>
          <UserCompanies key={`${id}:${relatedRevision}`} userId={id} />
        </>
      )}
      {decision && (
        <OperationDecisionDialog
          decision={decision}
          onClose={() => setDecision(null)}
          onSaved={refresh}
          onRefresh={refresh}
        />
      )}
    </OperationDetailsLayout>
  );
};
