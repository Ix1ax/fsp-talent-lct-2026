import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button } from '@/shared/ui';
import type { TaskSubmission } from '@/entities/company-task';

interface TaskSubmissionCardProps {
  submission: TaskSubmission;
}

export const TaskSubmissionCard = ({ submission }: TaskSubmissionCardProps) => {
  return (
    <article className="flex flex-col justify-between gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center">
      <div className="min-w-0 space-y-2">
        <p className="break-words text-sm text-muted-foreground">
          {submission.companyName}
        </p>
        <h2 className="break-words font-semibold">
          <Link
            href={`${STATIC_ROUTES.CANDIDATE_TASK_SUBMISSIONS}/${submission.id}`}
            className="hover:underline"
          >
            {submission.taskTitle}
          </Link>
        </h2>
        <p className="text-sm text-muted-foreground">
          {submission.status === 'reviewed' ? 'Проверено' : 'Ожидает проверки'}
          {submission.score !== null && ` · ${submission.score} из 100`} ·{' '}
          {new Date(submission.submittedAt).toLocaleDateString('ru-RU')}
        </p>
      </div>
      <Button asChild variant="outline" className="self-start">
        <Link
          href={`${STATIC_ROUTES.CANDIDATE_TASK_SUBMISSIONS}/${submission.id}`}
        >
          Посмотреть решение
        </Link>
      </Button>
    </article>
  );
};
