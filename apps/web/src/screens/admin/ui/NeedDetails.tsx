import Link from 'next/link';

import { adminNeedSchema, adminSchemas } from '@/entities/admin';
import {
  AdminPanel,
  ErrorNotice,
  OperationStatus,
  useAdminOptions,
  useAdminQuery,
} from '@/features/admin';

import { adminDate, adminSalary } from '../lib';
import { ContentModerationActions } from './ContentModerationActions';
import {
  AdminEntityLink,
  DescriptionPanel,
  DetailFields,
  OperationDetailsLayout,
} from './OperationDetailsLayout';

interface NeedDetailsProps {
  id: string;
}

export const NeedDetails = ({ id }: NeedDetailsProps) => {
  const query = useAdminQuery(`/needs/${id}`, adminNeedSchema);
  const need = query.data;
  const options = useAdminOptions([
    'specializations',
    'grades',
    'work_formats',
  ]);
  const name = (kind: string, value: number | null) =>
    value === null
      ? 'Не указан'
      : (options.data[kind]?.find((item) => item.id === String(value))?.name ??
        `ID ${value}`);
  return (
    <OperationDetailsLayout
      section="needs"
      title={need?.title}
      hasData={!!need}
      loading={query.loading}
      error={query.error}
      onReload={query.reload}
    >
      {need && (
        <>
          <AdminPanel>
            <div className="flex flex-wrap gap-2">
              <OperationStatus value={need.status} />
              <OperationStatus value={need.moderation_status} />
            </div>
            <DetailFields
              fields={[
                {
                  label: 'Компания',
                  value: (
                    <AdminEntityLink
                      section="companies"
                      id={need.company_id}
                      label={need.company_name}
                    />
                  ),
                },
                {
                  label: 'Специализация',
                  value: name('specializations', need.specialization_id),
                },
                { label: 'Грейд', value: name('grades', need.grade_id) },
                {
                  label: 'Зарплата',
                  value: adminSalary(need.salary_from_rub, need.salary_to_rub),
                },
                { label: 'Город', value: need.city },
                { label: 'Часовой пояс', value: need.timezone },
                {
                  label: 'Форматы работы',
                  value:
                    need.work_format_ids
                      .map((value) => name('work_formats', value))
                      .join(', ') || 'Не указаны',
                },
                { label: 'Создана', value: adminDate(need.created_at) },
                {
                  label: 'Автор',
                  value: (
                    <AdminEntityLink section="users" id={need.created_by} />
                  ),
                },
                { label: 'ID потребности', value: id },
              ]}
            />
            {Object.entries(options.catalogs).map(([kind, state]) => (
              <ErrorNotice
                key={kind}
                error={state.error}
                onRetry={() =>
                  options.reload(
                    kind as 'specializations' | 'grades' | 'work_formats',
                  )
                }
              />
            ))}
            <ContentModerationActions
              section="needs"
              id={id}
              title={need.title}
              hidden={need.moderation_status === 'hidden'}
              onSaved={query.reload}
            />
          </AdminPanel>
          <DescriptionPanel text={need.description} />
          <AdminPanel>
            <h2 className="font-medium">Навыки для подбора</h2>
            {!need.skills.length && (
              <p className="text-sm text-muted-foreground">Навыки не указаны</p>
            )}
            <ul className="grid gap-3">
              {need.skills.map((skill) => (
                <NeedSkill
                  key={skill.skill_id}
                  id={skill.skill_id}
                  required={skill.required ?? false}
                  weight={skill.weight}
                />
              ))}
            </ul>
          </AdminPanel>
        </>
      )}
    </OperationDetailsLayout>
  );
};
interface NeedSkillProps {
  id: string;
  required: boolean;
  weight: number;
}

const NeedSkill = ({ id, required, weight }: NeedSkillProps) => {
  const query = useAdminQuery(`/catalogs/skills/${id}`, adminSchemas.catalog);
  return (
    <li className="grid gap-1 border-b pb-3 last:border-0">
      <Link
        href={`/admin/moderation?skill_id=${id}`}
        className="text-sm text-brand-text underline-offset-4 hover:underline"
      >
        {query.data?.name ?? id}
      </Link>
      <span className="text-xs text-muted-foreground">
        {required ? 'Обязательный' : 'Дополнительный'} · Вес: {weight}
      </span>
      <ErrorNotice error={query.error} onRetry={query.reload} />
    </li>
  );
};
