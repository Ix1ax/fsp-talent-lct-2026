import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { Button } from '@/shared/ui';
import { type AdminStats } from '@/entities/admin';
import { AdminDistributionChart, AdminPanel } from '@/features/admin';

import { STATISTICS_COLORS } from '../constants';
import { getStatisticsRemainder } from '../lib';
import { StatisticsChartTitle } from './StatisticsChartTitle';

interface AssessmentStatisticsChartsProps {
  stats: AdminStats;
}
export const AssessmentStatisticsCharts = ({
  stats,
}: AssessmentStatisticsChartsProps) => {
  return (
    <>
      <AdminPanel>
        <StatisticsChartTitle
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
              color: STATISTICS_COLORS.success,
              href: '/admin/attempts?status=passed',
            },
            {
              label: 'Тест не пройден',
              value: stats.attempts.failed,
              color: STATISTICS_COLORS.danger,
              href: '/admin/attempts?status=failed',
            },
            {
              label: 'В процессе',
              value: stats.attempts.active,
              color: STATISTICS_COLORS.primary,
              href: '/admin/attempts?status=active',
            },
            {
              label: 'Время истекло',
              value: getStatisticsRemainder(
                stats.attempts.total,
                stats.attempts.passed,
                stats.attempts.failed,
                stats.attempts.active,
              ),
              color: STATISTICS_COLORS.muted,
              href: '/admin/attempts?status=expired',
            },
          ]}
        />
      </AdminPanel>
      <AdminPanel>
        <StatisticsChartTitle
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
              color: STATISTICS_COLORS.success,
              href: '/admin/offers?status=accepted',
            },
            {
              label: 'Отклонены',
              value: stats.offers.rejected,
              color: STATISTICS_COLORS.danger,
              href: '/admin/offers?status=rejected',
            },
            {
              label: 'Без решения',
              value: getStatisticsRemainder(
                stats.offers.total,
                stats.offers.accepted,
                stats.offers.rejected,
              ),
              color: STATISTICS_COLORS.primary,
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
    </>
  );
};
