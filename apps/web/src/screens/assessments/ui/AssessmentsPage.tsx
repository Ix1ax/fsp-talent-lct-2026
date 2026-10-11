'use client';

import { useRouter } from 'next/navigation';

import {
  AsyncState,
  PageWrapper,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import type { Catalogs, Skill } from '@/entities/catalog';
import { CandidateProfileGate } from '@/features/candidate/profile';

import { useAssessments } from '../model';
import { AssessmentHistory } from './AssessmentHistory';
import { AssessmentsHeader } from './AssessmentsHeader';
import { AssessmentsBodySkeleton } from './AssessmentsLoading';
import { AvailableAssessments } from './AvailableAssessments';
import { StartAssessmentDialog } from './StartAssessmentDialog';

interface AssessmentsContentProps {
  catalogs?: Catalogs;
  skills?: Skill[];
  catalogsError?: string;
}

const AssessmentsContent = ({
  catalogs,
  skills = [],
  catalogsError,
}: AssessmentsContentProps) => {
  const router = useRouter();
  const state = useAssessments();
  const { selected, busy, close, start } = state;

  return (
    <>
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
    </>
  );
};

type AssessmentsPageProps = AssessmentsContentProps;

// Шапка вне проверки профиля: пока она идёт, скелетон остаётся в контейнере страницы.
export const AssessmentsPage = (props: AssessmentsPageProps) => {
  return (
    <PageWrapper>
      <AssessmentsHeader />
      <CandidateProfileGate fallback={<AssessmentsBodySkeleton />}>
        <AssessmentsContent {...props} />
      </CandidateProfileGate>
    </PageWrapper>
  );
};
