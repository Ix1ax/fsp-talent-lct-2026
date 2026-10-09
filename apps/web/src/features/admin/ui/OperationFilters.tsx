import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Input } from '@/shared/ui';

import {
  operationConfig,
  operationFiltersSchema,
  type OperationFilterValues as FilterValues,
  type OperationSection,
  operationStatusLabels,
  userRoleLabels,
} from '../constants';
import { useAdminOptions } from '../model';
import { AdminFieldGrid } from './AdminFieldGrid';
import { AdminSelect, ErrorNotice, Field } from './Common';

interface OperationFiltersProps {
  section: OperationSection;
  values: FilterValues;
  onApply: (values: FilterValues) => void;
  onReset: () => void;
}
export const OperationFilters = ({
  section,
  values,
  onApply,
  onReset,
}: OperationFiltersProps) => {
  const config = operationConfig[section];
  const options = useAdminOptions(
    config.category ? ['specializations', 'grades'] : [],
  );
  const form = useForm<FilterValues>({
    resolver: zodResolver(operationFiltersSchema),
    defaultValues: values,
  });
  const select = (
    name: 'status' | 'role' | 'specialization_id' | 'grade_id',
    label: string,
    choices: { value: string; label: string }[],
  ) => (
    <Controller
      key={name}
      control={form.control}
      name={name}
      render={({ field }) => (
        <AdminSelect
          showLabel
          error={form.formState.errors[name]?.message}
          label={label}
          value={field.value}
          onChange={field.onChange}
          options={[{ value: '', label: 'Все' }, ...choices]}
        />
      )}
    />
  );
  return (
    <form onSubmit={form.handleSubmit(onApply)} className="grid gap-4">
      <AdminFieldGrid
        className={
          config.search && !config.company ? 'xl:grid-cols-2' : 'xl:grid-cols-3'
        }
      >
        {config.search && (
          <Field
            label={
              section === 'companies'
                ? 'Название или ИНН'
                : 'Название или описание'
            }
            error={form.formState.errors.q?.message}
          >
            <Input
              maxLength={200}
              placeholder="Поиск"
              {...form.register('q')}
            />
          </Field>
        )}
        {select(
          'status',
          section === 'tasks' ? 'Статус модерации' : 'Статус',
          config.statuses.map((value) => ({
            value,
            label: operationStatusLabels[value],
          })),
        )}
        {section === 'users' &&
          select(
            'role',
            'Роль',
            Object.entries(userRoleLabels).map(([value, label]) => ({
              value,
              label,
            })),
          )}
        {config.company && (
          <Field
            label="ID компании"
            error={form.formState.errors.company_id?.message}
          >
            <Input
              placeholder="UUID компании"
              {...form.register('company_id')}
            />
          </Field>
        )}
        {config.candidate && (
          <Field
            label="ID профиля кандидата"
            error={form.formState.errors.candidate_id?.message}
          >
            <Input
              placeholder="UUID профиля"
              {...form.register('candidate_id')}
            />
          </Field>
        )}
        {config.category && (
          <>
            {select(
              'specialization_id',
              'Специализация',
              (options.data.specializations ?? []).map((item) => ({
                value: item.id,
                label: item.name,
              })),
            )}
            {select(
              'grade_id',
              'Грейд',
              (options.data.grades ?? []).map((item) => ({
                value: item.id,
                label: item.name,
              })),
            )}
          </>
        )}
      </AdminFieldGrid>
      {config.category && (
        <>
          <ErrorNotice
            error={options.catalogs.specializations?.error}
            onRetry={() => options.reload('specializations')}
          />
          <ErrorNotice
            error={options.catalogs.grades?.error}
            onRetry={() => options.reload('grades')}
          />
        </>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit">Применить</Button>
        <Button type="button" variant="outline" onClick={onReset}>
          Сбросить
        </Button>
      </div>
    </form>
  );
};
