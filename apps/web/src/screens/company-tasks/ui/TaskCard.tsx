import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { Badge, Button } from '@/shared/ui';
import type { CompanyTask } from '@/entities/company-task';

interface TaskCardProps {
  task: CompanyTask;
}

export const TaskCard = ({ task }: TaskCardProps) => {
  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          {task.status === 'open' ? 'Приём открыт' : 'Приём завершён'}
        </Badge>
        {task.mySubmission && (
          <Badge variant="outline">
            {task.mySubmission.status === 'reviewed'
              ? 'Решение проверено'
              : 'Решение отправлено'}
          </Badge>
        )}
      </div>
      <div>
        <p className="break-words text-sm text-muted-foreground">
          {task.companyName}
        </p>
        <h2 className="mt-2 break-words text-lg font-semibold">
          <Link
            href={`${STATIC_ROUTES.CANDIDATE_TASKS}/${task.id}`}
            className="hover:underline"
          >
            {task.title}
          </Link>
        </h2>
      </div>
      <p className="line-clamp-3 break-words text-sm text-muted-foreground">
        {task.description || 'Условие задания — в приложенном файле.'}
      </p>
      <p className="mt-auto text-sm text-muted-foreground">
        {task.deadlineAt
          ? `До ${new Date(task.deadlineAt).toLocaleString('ru-RU')}`
          : 'Без срока окончания'}
      </p>
      <Button asChild variant="outline" className="self-start">
        <Link href={`${STATIC_ROUTES.CANDIDATE_TASKS}/${task.id}`}>
          Открыть задание
        </Link>
      </Button>
    </article>
  );
};
