import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { Button } from '@/shared/ui';
import { type AdminStats } from '@/entities/admin';
import { AdminDistributionChart, AdminPanel } from '@/features/admin';

import { STATISTICS_COLORS } from '../constants';
import { adminNumber } from '../lib';
import { StatisticsChartTitle } from './StatisticsChartTitle';

interface NeedsStatisticsChartProps {
  stats: AdminStats;
}
export const NeedsStatisticsChart = ({ stats }: NeedsStatisticsChartProps) => {
  return (
    <>
      <AdminPanel>
        <StatisticsChartTitle
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
              color: STATISTICS_COLORS.positive,
              href: '/admin/needs?status=active',
            },
            {
              label: 'Скрыты модерацией',
              value: stats.needs.hidden,
              color: STATISTICS_COLORS.negative,
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
    </>
  );
};
