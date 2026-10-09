'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  Building2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  RefreshCw,
  Users,
} from 'lucide-react';

import { Button, Card, Skeleton } from '@/shared/ui';
import { adminStatsSchema } from '@/entities/admin';
import {
  AdminDistributionChart,
  AdminPanel,
  ErrorNotice,
  useAdminQuery,
} from '@/features/admin';

import { adminDate, adminNumber } from '../lib';
import { AdminPageHeader } from './AdminPageHeader';

const colors = {
  primary: 'var(--brand-text)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  muted: 'var(--caption)',
  danger: 'var(--destructive)',
};
export const StatisticsPage = () => {
  const query = useAdminQuery('/stats', adminStatsSchema);
  const stats = query.data;
  const rest = (total: number, ...values: number[]) =>
    Math.max(0, total - values.reduce((sum, value) => sum + value, 0));
  return (
    <div className="grid min-w-0 gap-6">
      <AdminPageHeader
        title="Обзор платформы"
        description="Текущие показатели и очереди, которые требуют внимания."
        action={
          <Button
            variant="outline"
            disabled={query.loading}
            onClick={query.reload}
          >
            <RefreshCw
              className={
                query.loading ? 'animate-spin motion-reduce:animate-none' : ''
              }
            />
            Обновить
          </Button>
        }
      />
      <ErrorNotice error={query.error} onRetry={query.reload} />
      {query.loading && !stats && (
        <div
          role="status"
          aria-label="Загружаем статистику"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {Array.from({ length: 8 }, (_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-4 w-full" />
            </Card>
          ))}
        </div>
      )}
      {stats && (
        <div aria-busy={query.loading} className="grid gap-6">
          <p
            className="text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {query.loading
              ? 'Обновляем показатели…'
              : `Срез на ${adminDate(stats.generated_at)} (Москва)`}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Пользователи',
                value: stats.users.total,
                note: `${adminNumber(stats.users.candidates)} кандидатов · ${adminNumber(stats.users.employers)} работодателей`,
                href: '/admin/users',
                icon: Users,
              },
              {
                label: 'Компании',
                value: stats.companies.total,
                note: `${adminNumber(stats.companies.verified)} подтверждено`,
                href: '/admin/companies',
                icon: Building2,
              },
              {
                label: 'Активные потребности',
                value: stats.needs.active,
                note: `из ${adminNumber(stats.needs.total)} потребностей`,
                href: '/admin/needs?status=active',
                icon: FileText,
              },
              {
                label: 'Попытки тестирования',
                value: stats.attempts.total,
                note: `${adminNumber(stats.attempts.passed)} тестов пройдено`,
                href: '/admin/attempts',
                icon: GraduationCap,
              },
            ].map(({ label, value, note, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="group min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
              >
                <AdminPanel className="h-full gap-3 transition-colors group-hover:border-primary/40">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">
                      {label}
                    </span>
                    <Icon
                      size={18}
                      aria-hidden="true"
                      className="text-brand-text"
                    />
                  </div>
                  <p className="text-3xl font-semibold tabular-nums sm:text-4xl">
                    {adminNumber(value)}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {note}
                  </p>
                </AdminPanel>
              </Link>
            ))}
          </div>
          <AdminPanel className="gap-4 border-primary/20 bg-accent/40">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={18} className="text-brand-text" />
              <h2 className="font-medium">Требуют внимания</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <QueueLink
                href="/admin/companies?status=pending"
                title="Компании на проверке"
                value={stats.companies.pending}
              />
              <QueueLink
                href="/admin/moderation"
                title="Новые навыки на модерации"
                value={stats.skills_pending}
              />
            </div>
          </AdminPanel>
          <div className="grid min-w-0 gap-6 xl:grid-cols-2">
            <AdminPanel>
              <ChartTitle
                title="Пользователи"
                description="Распределение по статусу доступа"
              />
              <AdminDistributionChart
                title="Пользователи"
                total={stats.users.total}
                segments={[
                  {
                    label: 'Активные',
                    value: stats.users.active,
                    color: colors.primary,
                    href: '/admin/users?status=active',
                  },
                  {
                    label: 'Заблокированные',
                    value: stats.users.blocked,
                    color: colors.danger,
                    href: '/admin/users?status=blocked',
                  },
                  {
                    label: 'Удалённые',
                    value: stats.users.deleted,
                    color: colors.muted,
                    href: '/admin/users?status=deleted',
                  },
                ]}
              />
            </AdminPanel>
            <AdminPanel>
              <ChartTitle
                title="Проверка компаний"
                description="Статусы заявок на подтверждение"
              />
              <AdminDistributionChart
                title="Компании"
                total={stats.companies.total}
                segments={[
                  {
                    label: 'Подтверждены',
                    value: stats.companies.verified,
                    color: colors.success,
                    href: '/admin/companies?status=verified',
                  },
                  {
                    label: 'Ожидают проверки',
                    value: stats.companies.pending,
                    color: colors.warning,
                    href: '/admin/companies?status=pending',
                  },
                  {
                    label: 'Отклонены',
                    value: stats.companies.rejected,
                    color: colors.danger,
                    href: '/admin/companies?status=rejected',
                  },
                  {
                    label: 'Не подтверждены',
                    value: rest(
                      stats.companies.total,
                      stats.companies.verified,
                      stats.companies.pending,
                      stats.companies.rejected,
                    ),
                    color: colors.muted,
                    href: '/admin/companies?status=unverified',
                  },
                ]}
              />
            </AdminPanel>
            <AdminPanel>
              <ChartTitle
                title="Тестирование"
                description="Доля каждого статуса среди всех попыток"
              />
              <AdminDistributionChart
                kind="bars"
                title="Тестирование"
                total={stats.attempts.total}
                segments={[
                  {
                    label: 'Тест пройден',
                    value: stats.attempts.passed,
                    color: colors.success,
                    href: '/admin/attempts?status=passed',
                  },
                  {
                    label: 'Тест не пройден',
                    value: stats.attempts.failed,
                    color: colors.danger,
                    href: '/admin/attempts?status=failed',
                  },
                  {
                    label: 'В процессе',
                    value: stats.attempts.active,
                    color: colors.primary,
                    href: '/admin/attempts?status=active',
                  },
                  {
                    label: 'Время истекло',
                    value: rest(
                      stats.attempts.total,
                      stats.attempts.passed,
                      stats.attempts.failed,
                      stats.attempts.active,
                    ),
                    color: colors.muted,
                    href: '/admin/attempts?status=expired',
                  },
                ]}
              />
            </AdminPanel>
            <AdminPanel>
              <ChartTitle
                title="Предложения кандидатам"
                description="Решения по отправленным предложениям"
              />
              <AdminDistributionChart
                title="Предложения"
                total={stats.offers.total}
                segments={[
                  {
                    label: 'Приняты',
                    value: stats.offers.accepted,
                    color: colors.success,
                    href: '/admin/offers?status=accepted',
                  },
                  {
                    label: 'Отклонены',
                    value: stats.offers.rejected,
                    color: colors.danger,
                    href: '/admin/offers?status=rejected',
                  },
                  {
                    label: 'Без решения',
                    value: rest(
                      stats.offers.total,
                      stats.offers.accepted,
                      stats.offers.rejected,
                    ),
                    color: colors.primary,
                  },
                ]}
              />
              <Button variant="outline" asChild>
                <Link href="/admin/offers">
                  Все предложения
                  <ArrowUpRight />
                </Link>
              </Button>
            </AdminPanel>
            <AdminPanel>
              <ChartTitle
                title="Задания компаний"
                description={`Всего опубликовано: ${adminNumber(stats.tasks.total)}`}
              />
              <AdminDistributionChart
                kind="bars"
                title="Задания"
                total={stats.tasks.total}
                segments={[
                  {
                    label: 'Приём решений открыт',
                    value: stats.tasks.open,
                    color: colors.primary,
                  },
                  {
                    label: 'Скрыты модерацией',
                    value: stats.tasks.hidden,
                    color: colors.danger,
                    href: '/admin/tasks?status=hidden',
                  },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                Открытые задания учитывают срок приёма. Скрытые задания закрыты
                для кандидатов.
              </p>
              <Button variant="outline" asChild>
                <Link href="/admin/tasks">
                  Все задания
                  <ArrowUpRight />
                </Link>
              </Button>
            </AdminPanel>
            <AdminPanel>
              <ChartTitle
                title="Решения заданий"
                description="Прогресс проверки решений работодателями"
              />
              <AdminDistributionChart
                title="Решения"
                total={stats.submissions.total}
                segments={[
                  {
                    label: 'Проверены',
                    value: stats.submissions.reviewed,
                    color: colors.success,
                  },
                  {
                    label: 'Ожидают оценки',
                    value: rest(
                      stats.submissions.total,
                      stats.submissions.reviewed,
                    ),
                    color: colors.warning,
                  },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                Оценки и отзывы оставляют компании в своём кабинете.
              </p>
            </AdminPanel>
          </div>
          <AdminPanel>
            <ChartTitle
              title="Потребности работодателей"
              description={`Всего: ${adminNumber(stats.needs.total)} · Активны: ${adminNumber(stats.needs.active)} · Скрыты: ${adminNumber(stats.needs.hidden)}`}
            />
            <AdminDistributionChart
              kind="bars"
              title="Потребности"
              total={stats.needs.total}
              segments={[
                {
                  label: 'Активные',
                  value: stats.needs.active,
                  color: colors.primary,
                  href: '/admin/needs?status=active',
                },
                {
                  label: 'Скрыты модерацией',
                  value: stats.needs.hidden,
                  color: colors.danger,
                },
              ]}
            />
            <Button variant="outline" asChild>
              <Link href="/admin/needs">
                Все потребности
                <ArrowUpRight />
              </Link>
            </Button>
          </AdminPanel>
        </div>
      )}
    </div>
  );
};
const ChartTitle = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div>
    <h2 className="text-lg font-medium">{title}</h2>
    <p className="mt-1 text-xs text-muted-foreground">{description}</p>
  </div>
);
const QueueLink = ({
  href,
  title,
  value,
}: {
  href: string;
  title: string;
  value: number;
}) => (
  <Link
    href={href}
    className="flex min-w-0 items-center justify-between gap-4 rounded-md border bg-card px-4 py-3 transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-ring"
  >
    <span className="text-sm">{title}</span>
    <span className="flex shrink-0 items-center gap-3 text-xl font-semibold tabular-nums">
      {adminNumber(value)}
      <ArrowUpRight size={16} className="text-muted-foreground" />
    </span>
  </Link>
);
