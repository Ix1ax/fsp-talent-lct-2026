import {
  Building2Icon,
  CalendarClockIcon,
  CheckCircle2Icon,
} from 'lucide-react';

import { Badge } from '@/shared/ui';
import type { CompanyTask } from '@/entities/company-task';
import { isTaskOpen } from '@/features/task-solution';

interface TaskDetailsHeaderProps {
  task: CompanyTask;
  now: number;
}

export const TaskDetailsHeader = ({ task, now }: TaskDetailsHeaderProps) => {
  return (
    <header className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Building2Icon aria-hidden="true" className="size-4" />
          {task.companyName}
        </span>
        <Badge variant={isTaskOpen(task, now) ? 'success' : 'secondary'}>
          {isTaskOpen(task, now) ? 'Приём открыт' : 'Приём завершён'}
        </Badge>
      </div>
      <h1 className="max-w-4xl break-words text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
        {task.title}
      </h1>
      <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <CalendarClockIcon aria-hidden="true" className="size-4 shrink-0" />
          {task.deadlineAt
            ? `Приём до ${new Date(task.deadlineAt).toLocaleString('ru-RU')}`
            : 'Без срока окончания'}
        </span>
        <span className="inline-flex items-center gap-2">
          <CheckCircle2Icon aria-hidden="true" className="size-4 shrink-0" />
          Одна окончательная отправка
        </span>
      </div>
    </header>
  );
};
