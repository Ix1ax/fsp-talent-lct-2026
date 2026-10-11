import { FileTextIcon } from 'lucide-react';

import { formatFileSize } from '@/shared/utils';
import { type CompanyTask, downloadTask } from '@/entities/company-task';

import { TaskFileDownload } from './TaskFileDownload';

interface TaskConditionProps {
  task: CompanyTask;
}

export const TaskCondition = ({ task }: TaskConditionProps) => {
  return (
    <section
      aria-labelledby="task-condition-title"
      className="grid min-w-0 gap-6 rounded-xl border bg-card p-5 sm:p-6"
    >
      <div className="grid gap-4">
        <h2 id="task-condition-title" className="text-xl font-semibold">
          Условие задания
        </h2>
        <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-muted-foreground">
          {task.description || 'Скачайте файл с полным условием задания.'}
        </p>
      </div>
      <div className="grid gap-4 border-t pt-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <FileTextIcon
              aria-hidden="true"
              className="size-5 text-muted-foreground"
            />
          </span>
          <div>
            <h3 className="font-medium">Файл условия</h3>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(task.file.sizeBytes)}
            </p>
          </div>
        </div>
        <TaskFileDownload
          name={task.file.originalName}
          load={() => downloadTask(task.id)}
        />
      </div>
    </section>
  );
};
