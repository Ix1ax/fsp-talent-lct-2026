import { Button, Input, Label, OptionSelect } from '@/shared/ui';
import type { TaskFilters } from '@/entities/company-task';

interface TaskFiltersFormProps {
  filters: TaskFilters;
  query: string;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: TaskFilters['status']) => void;
  onSearch: () => void;
}

export const TaskFiltersForm = ({
  filters,
  query: q,
  onQueryChange,
  onStatusChange,
  onSearch,
}: TaskFiltersFormProps) => {
  return (
    <form
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Label htmlFor="task-search">Поиск заданий</Label>
        <Input
          id="task-search"
          value={q}
          maxLength={200}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Название или описание"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-2 sm:w-56">
        <Label htmlFor="task-status">Приём решений</Label>
        <OptionSelect
          id="task-status"
          value={filters.status || 'all'}
          options={[
            { value: 'all', label: 'Все задания' },
            { value: 'open', label: 'Приём открыт' },
            { value: 'closed', label: 'Приём завершён' },
          ]}
          onValueChange={(value) => {
            onStatusChange(value as TaskFilters['status']);
          }}
        />
      </div>
      <Button type="submit">Найти</Button>
    </form>
  );
};
