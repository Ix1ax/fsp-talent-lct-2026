import {
  Building2Icon,
  CalendarClockIcon,
  CheckCircle2Icon,
} from 'lucide-react';

import { Badge, PageHeader } from '@/shared/ui';
import type { CompanyTask } from '@/entities/company-task';
import { isTaskOpen } from '@/features/task-solution';

interface TaskDetailsHeaderProps {
  task: CompanyTask;
  now: number;
}

export const TaskDetailsHeader = ({ task, now }: TaskDetailsHeaderProps) => {
  return (
    <PageHeader>
      <PageHeader.Row>
        <PageHeader.Content>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Building2Icon aria-hidden="true" className="size-4" />
              {task.companyName}
            </span>
            <Badge variant={isTaskOpen(task, now) ? 'success' : 'secondary'}>
              {isTaskOpen(task, now) ? 'Приём открыт' : 'Приём завершён'}
            </Badge>
          </div>
          <PageHeader.Title>{task.title}</PageHeader.Title>
        </PageHeader.Content>
      </PageHeader.Row>
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
    </PageHeader>
  );
};
