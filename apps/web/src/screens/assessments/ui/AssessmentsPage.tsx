'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

import { DYNAMIC_ROUTES, STATIC_ROUTES } from '@/shared/contants';
import {
  AsyncState,
  Button,
  PageHeader,
  Skeleton,
  Stagger,
  StaggerItem,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import type { Catalogs, Skill } from '@/entities/catalog';

import { useAssessments } from '../model';
import { AssessmentHistory } from './AssessmentHistory';
import { AvailableAssessmentCard } from './AvailableAssessmentCard';
import { StartAssessmentDialog } from './StartAssessmentDialog';

interface AssessmentsPageProps {
  catalogs?: Catalogs;
  skills?: Skill[];
}

export const AssessmentsPage = ({
  catalogs,
  skills = [],
}: AssessmentsPageProps) => {
  const {
    items,
    current,
    loading,
    error,
    errorType,
    selected,
    busy,
    refresh,
    select,
    close,
    start,
  } = useAssessments();

  return (
    <main className="container-page page-rhythm flex flex-1 flex-col gap-8">
      <PageHeader
        title="Тестирование"
        description="Подтвердите навыки и грейд. Результаты проверяются автоматически."
        actions={
          <Button asChild variant="outline">
            <Link href={STATIC_ROUTES.CANDIDATE}>
              <ArrowLeftIcon aria-hidden="true" />В кабинет
            </Link>
          </Button>
        }
      />
      <Tabs defaultValue="available" className="gap-6">
        <TabsList
          aria-label="Тестирование"
          className="h-auto min-h-11 w-full sm:w-fit"
        >
          <TabsTrigger value="available" className="min-h-9">
            Доступные тесты
          </TabsTrigger>
          <TabsTrigger value="history" className="min-h-9">
            История попыток
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="available"
          className="animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
        >
          <div className="grid gap-6">
            <p className="text-sm text-muted-foreground">
              Перед тестированием можно{' '}
              <Link
                className="underline underline-offset-4"
                href={STATIC_ROUTES.CANDIDATE_SURVEY}
              >
                выбрать направление и уровень
              </Link>
              .
            </p>
            {current && (
              <Button asChild className="h-auto min-h-11 whitespace-normal">
                <Link href={DYNAMIC_ROUTES.CANDIDATE_ASSESSMENT(current)}>
                  Продолжить активный тест
                </Link>
              </Button>
            )}
            {error && (
              <AsyncState
                error
                title={
                  errorType === 'start'
                    ? 'Не удалось начать тест'
                    : 'Не удалось загрузить тесты'
                }
                description={error}
                onRetry={refresh}
              />
            )}
            <Button
              className="min-h-11 self-start"
              variant="outline"
              disabled={loading || busy}
              onClick={refresh}
            >
              Обновить список
            </Button>
            {loading && (
              <div
                role="status"
                aria-label="Загружаем тесты"
                className="grid gap-4"
              >
                <Skeleton className="h-36 w-full" />
                <Skeleton className="h-36 w-full" />
              </div>
            )}
            {!loading && !error && items.length === 0 && (
              <AsyncState
                title="Доступных тестов пока нет"
                description="Проверьте навыки в профиле. Новые тесты появятся здесь, когда станут доступны."
              />
            )}
            {!loading && (
              <Stagger
                interval={Math.min(0.04, 0.2 / Math.max(1, items.length))}
                className="grid gap-4"
              >
                {items.map((test, index) => (
                  <StaggerItem
                    key={`${test.specializationId}-${test.gradeId}-${index}`}
                    className="min-w-0"
                  >
                    <AvailableAssessmentCard
                      test={test}
                      catalogs={catalogs}
                      skills={skills}
                      disabled={busy || !!current}
                      onSelect={select}
                    />
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </div>
        </TabsContent>
        <TabsContent
          value="history"
          className="animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
        >
          <AssessmentHistory catalogs={catalogs} />
        </TabsContent>
      </Tabs>
      <StartAssessmentDialog
        test={selected}
        catalogs={catalogs}
        skills={skills}
        busy={busy}
        onClose={close}
        onStart={start}
      />
    </main>
  );
};
