import { TaskDetailsSkeleton } from './TaskDetailsSkeleton';
import { TasksShell } from './TasksShell';

export const TaskDetailsLoading = () => (
  <TasksShell title="Задание компании" detail>
    <TaskDetailsSkeleton />
  </TasksShell>
);
