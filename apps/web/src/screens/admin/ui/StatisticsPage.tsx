'use client';
import { RefreshCw } from 'lucide-react';

import { Button, Card, Skeleton } from '@/shared/ui';
import { adminStatsSchema } from '@/entities/admin';
import { ErrorNotice, useAdminQuery } from '@/features/admin';

import { adminDate } from '../lib';
import { AdminPageHeader } from './AdminPageHeader';
import { AssessmentStatisticsCharts } from './AssessmentStatisticsCharts';
import { CompanyStatisticsCharts } from './CompanyStatisticsCharts';
import { NeedsStatisticsChart } from './NeedsStatisticsChart';
import { StatisticsSummary } from './StatisticsSummary';
import { TaskStatisticsCharts } from './TaskStatisticsCharts';

export const StatisticsPage = () => {
  const query = useAdminQuery('/stats', adminStatsSchema);
  const stats = query.data;
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
          <StatisticsSummary stats={stats} />

          <div className="grid min-w-0 gap-6 xl:grid-cols-2">
            <CompanyStatisticsCharts stats={stats} />

            <AssessmentStatisticsCharts stats={stats} />

            <TaskStatisticsCharts stats={stats} />
          </div>
          <NeedsStatisticsChart stats={stats} />
        </div>
      )}
    </div>
  );
};
