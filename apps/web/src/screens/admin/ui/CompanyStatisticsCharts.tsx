import { type AdminStats } from '@/entities/admin';
import { AdminDistributionChart, AdminPanel } from '@/features/admin';

import { STATISTICS_COLORS } from '../constants';
import { getStatisticsRemainder } from '../lib';
import { StatisticsChartTitle } from './StatisticsChartTitle';

interface CompanyStatisticsChartsProps {
  stats: AdminStats;
}
export const CompanyStatisticsCharts = ({
  stats,
}: CompanyStatisticsChartsProps) => {
  return (
    <>
      <AdminPanel>
        <StatisticsChartTitle
          title="Доступ компаний"
          description="Блокировки компаний учитываются отдельно от подтверждения"
        />
        <AdminDistributionChart
          title="Доступ компаний"
          total={stats.companies.total}
          segments={[
            {
              label: 'Активные',
              value: stats.companies.active,
              color: STATISTICS_COLORS.positive,
              href: '/admin/companies?access_status=active',
            },
            {
              label: 'Заблокированные',
              value: stats.companies.blocked,
              color: STATISTICS_COLORS.negative,
              href: '/admin/companies?access_status=blocked',
            },
          ]}
        />
      </AdminPanel>
      <AdminPanel>
        <StatisticsChartTitle
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
              color: STATISTICS_COLORS.positive,
              href: '/admin/users?status=active',
            },
            {
              label: 'Заблокированные',
              value: stats.users.blocked,
              color: STATISTICS_COLORS.negative,
              href: '/admin/users?status=blocked',
            },
            {
              label: 'Удалённые',
              value: stats.users.deleted,
              color: STATISTICS_COLORS.neutral,
              href: '/admin/users?status=deleted',
            },
          ]}
        />
      </AdminPanel>
      <AdminPanel>
        <StatisticsChartTitle
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
              color: STATISTICS_COLORS.positive,
              href: '/admin/companies?status=verified',
            },
            {
              label: 'Ожидают проверки',
              value: stats.companies.pending,
              color: STATISTICS_COLORS.progress,
              href: '/admin/companies?status=pending',
            },
            {
              label: 'Отклонены',
              value: stats.companies.rejected,
              color: STATISTICS_COLORS.negative,
              href: '/admin/companies?status=rejected',
            },
            {
              label: 'Не подтверждены',
              value: getStatisticsRemainder(
                stats.companies.total,
                stats.companies.verified,
                stats.companies.pending,
                stats.companies.rejected,
              ),
              color: STATISTICS_COLORS.neutral,
              href: '/admin/companies?status=unverified',
            },
          ]}
        />
      </AdminPanel>
    </>
  );
};
