import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { AsyncState, Button, FadeIn } from '@/shared/ui';
import type { CompanyTask, TaskSubmission } from '@/entities/company-task';
import { isTaskOpen, TaskSolutionForm } from '@/features/task-solution';

import { SubmissionResult } from './SubmissionResult';

interface TaskSolutionSectionProps {
  task: CompanyTask;
  submission?: TaskSubmission;
  now: number;
  onSubmitted: (submission: TaskSubmission) => void;
}

export const TaskSolutionSection = ({
  task,
  submission,
  now,
  onSubmitted,
}: TaskSolutionSectionProps) => {
  return (
    <div className="min-w-0">
      {submission && (
        <FadeIn distance={4}>
          <SubmissionResult submission={submission} />
        </FadeIn>
      )}
      {!submission && task.mySubmission && (
        <div className="space-y-4 rounded-xl border bg-card p-6">
          <h2 className="font-semibold">Вы уже отправили решение</h2>
          <p className="text-sm text-muted-foreground">
            Повторная отправка и замена файла недоступны.
          </p>
          <Button asChild>
            <Link
              href={`${STATIC_ROUTES.CANDIDATE_TASK_SUBMISSIONS}/${task.mySubmission.id}`}
            >
              Посмотреть решение
            </Link>
          </Button>
        </div>
      )}
      {!submission && !task.mySubmission && isTaskOpen(task, now) && (
        <TaskSolutionForm task={task} onSubmitted={onSubmitted} />
      )}
      {!submission && !task.mySubmission && !isTaskOpen(task, now) && (
        <AsyncState
          title="Приём решений завершён"
          description="Условие можно скачать, но отправить решение уже нельзя."
        />
      )}
    </div>
  );
};
