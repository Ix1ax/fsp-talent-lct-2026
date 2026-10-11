'use client';

import { PageWrapper, Tabs, TabsList, TabsTrigger } from '@/shared/ui';

import { AssessmentCardSkeleton } from './AssessmentCardSkeleton';
import { AssessmentsHeader } from './AssessmentsHeader';

/** Вкладки статичны, скелетон — только список тестов. */
export const AssessmentsBodySkeleton = () => {
  return (
    <>
      <Tabs defaultValue="available" className="gap-6">
        <TabsList
          aria-label="Тестирование"
          className="h-auto min-h-11 w-full sm:w-fit"
        >
          <TabsTrigger value="available" className="min-h-9">
            Доступные тесты
          </TabsTrigger>
          <TabsTrigger value="history" className="min-h-9" disabled>
            История попыток
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div role="status" aria-busy="true" aria-label="Загружаем тесты">
        <span className="sr-only">Загружаем тесты</span>
        <div aria-hidden="true" className="grid gap-4">
          <AssessmentCardSkeleton />
          <AssessmentCardSkeleton />
        </div>
      </div>
    </>
  );
};

/** Каркас загрузки «Тестирования»: шапка и вкладки статичны, скелетон — только список. */
export const AssessmentsLoading = () => {
  return (
    <PageWrapper>
      <AssessmentsHeader />
      <AssessmentsBodySkeleton />
    </PageWrapper>
  );
};
