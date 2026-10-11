import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { Button } from '@/shared/ui';
import { type AdminStats } from '@/entities/admin';
import { AdminDistributionChart, AdminPanel } from '@/features/admin';

import { STATISTICS_COLORS } from '../constants';
import { adminNumber, getStatisticsRemainder } from '../lib';
import { StatisticsChartTitle } from './StatisticsChartTitle';

interface TaskStatisticsChartsProps {
  stats: AdminStats;
}
export const TaskStatisticsCharts = ({ stats }: TaskStatisticsChartsProps) => {
  return (
    <>
      <AdminPanel>
        <StatisticsChartTitle
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
              color: STATISTICS_COLORS.primary,
            },
            {
              label: 'Скрыты модерацией',
              value: stats.tasks.hidden,
              color: STATISTICS_COLORS.danger,
              href: '/admin/tasks?status=hidden',
            },
          ]}
        />
        <p className="text-xs text-muted-foreground">
          Открытые задания учитывают срок приёма. Скрытые задания закрыты для
          кандидатов.
        </p>
        <Button variant="outline" asChild>
          <Link href="/admin/tasks">
            Все задания
            <ArrowUpRight />
          </Link>
        </Button>
      </AdminPanel>
      <AdminPanel>
        <StatisticsChartTitle
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
              color: STATISTICS_COLORS.success,
            },
            {
              label: 'Ожидают оценки',
              value: getStatisticsRemainder(
                stats.submissions.total,
                stats.submissions.reviewed,
              ),
              color: STATISTICS_COLORS.warning,
            },
          ]}
        />
        <p className="text-xs text-muted-foreground">
          Оценки и отзывы оставляют компании в своём кабинете.
        </p>
      </AdminPanel>
    </>
  );
};
