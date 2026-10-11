'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import {
  AsyncState,
  Button,
  PageHeader,
  PageWrapper,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import type { Catalogs, Skill } from '@/entities/catalog';

import { useAssessments } from '../model';
import { AssessmentHistory } from './AssessmentHistory';
import { AvailableAssessments } from './AvailableAssessments';
import { StartAssessmentDialog } from './StartAssessmentDialog';

interface AssessmentsPageProps {
  catalogs?: Catalogs;
  skills?: Skill[];
  catalogsError?: string;
}

export const AssessmentsPage = ({
  catalogs,
  skills = [],
  catalogsError,
}: AssessmentsPageProps) => {
  const router = useRouter();
  const state = useAssessments();
  const { selected, busy, close, start } = state;

  return (
    <PageWrapper>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Content>
            <PageHeader.Title>Тестирование</PageHeader.Title>
            <PageHeader.Description>
              Подтвердите навыки и грейд. Результаты проверяются автоматически.
            </PageHeader.Description>
          </PageHeader.Content>
          <PageHeader.Actions>
            <Button asChild variant="outline">
              <Link href={STATIC_ROUTES.CANDIDATE}>
                <ArrowLeftIcon aria-hidden="true" />В кабинет
              </Link>
            </Button>
          </PageHeader.Actions>
        </PageHeader.Row>
      </PageHeader>
      {catalogsError && (
        <AsyncState
          error
          title="Справочники недоступны"
          description={catalogsError}
          onRetry={() => router.refresh()}
        />
      )}
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
          <AvailableAssessments
            state={state}
            catalogs={catalogs}
            skills={skills}
          />
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
    </PageWrapper>
  );
};
