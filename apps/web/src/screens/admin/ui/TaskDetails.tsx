import { adminCompanyTaskSchema } from '@/entities/admin';
import {
  AdminFileDownload,
  AdminPanel,
  ErrorNotice,
  OperationStatus,
  useAdminOptions,
  useAdminQuery,
} from '@/features/admin';

import { adminDate, adminNumber } from '../lib';
import { ContentModerationActions } from './ContentModerationActions';
import {
  AdminEntityLink,
  DescriptionPanel,
  DetailFields,
  OperationDetailsLayout,
} from './OperationDetailsLayout';

interface TaskDetailsProps {
  id: string;
}

export const TaskDetails = ({ id }: TaskDetailsProps) => {
  const query = useAdminQuery(`/tasks/${id}`, adminCompanyTaskSchema);
  const task = query.data;
  const options = useAdminOptions(['specializations', 'grades']);
  const name = (kind: string, value: number | null) =>
    value === null
      ? 'Не указан'
      : (options.data[kind]?.find((item) => item.id === String(value))?.name ??
        `ID ${value}`);
  return (
    <OperationDetailsLayout
      section="tasks"
      title={task?.title}
      hasData={!!task}
      loading={query.loading}
      error={query.error}
      onReload={query.reload}
    >
      {task && (
        <>
          <AdminPanel>
            <div className="flex flex-wrap gap-2">
              <OperationStatus value={task.status} />
              <OperationStatus value={task.moderation_status} />
            </div>
            <DetailFields
              fields={[
                {
                  label: 'Компания',
                  value: (
                    <AdminEntityLink
                      section="companies"
                      id={task.company_id}
                      label={task.company_name}
                    />
                  ),
                },
                {
                  label: 'Специализация',
                  value: name('specializations', task.specialization_id),
                },
                { label: 'Грейд', value: name('grades', task.grade_id) },
                { label: 'Опубликовано', value: adminDate(task.published_at) },
                { label: 'День публикации (Москва)', value: task.published_on },
                { label: 'Приём до', value: adminDate(task.deadline_at) },
                {
                  label: 'Получено решений',
                  value: adminNumber(task.submissions_count),
                },
                {
                  label: 'Автор',
                  value: (
                    <AdminEntityLink section="users" id={task.created_by} />
                  ),
                },
                { label: 'ID задания', value: id },
              ]}
            />
            {Object.entries(options.catalogs).map(([kind, state]) => (
              <ErrorNotice
                key={kind}
                error={state.error}
                onRetry={() =>
                  options.reload(kind as 'specializations' | 'grades')
                }
              />
            ))}
            <ContentModerationActions
              section="tasks"
              id={id}
              title={task.title}
              hidden={task.moderation_status === 'hidden'}
              onSaved={query.reload}
            />
          </AdminPanel>
          <DescriptionPanel text={task.description} />
          <AdminPanel>
            <h2 className="font-medium">Файл задания</h2>
            <p className="text-sm">{task.file.original_name}</p>
            <p className="text-xs text-muted-foreground">
              {task.file.media_type} ·{' '}
              {adminNumber(Math.ceil(task.file.size_bytes / 1024))} КБ
            </p>
            <div className="justify-self-start">
              <AdminFileDownload
                path={`/tasks/${id}/file`}
                name={task.file.original_name}
              />
            </div>
          </AdminPanel>
        </>
      )}
    </OperationDetailsLayout>
  );
};
