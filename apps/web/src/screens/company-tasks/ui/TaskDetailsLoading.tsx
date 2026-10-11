import { TaskDetailsSkeleton } from './TaskDetailsSkeleton';
import { TasksShell } from './TasksShell';

export const TaskDetailsLoading = () => {
  return (
    <TasksShell title="Задание компании" detail>
      <TaskDetailsSkeleton />
    </TasksShell>
  );
};
