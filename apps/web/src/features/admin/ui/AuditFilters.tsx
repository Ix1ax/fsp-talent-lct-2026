import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Input } from '@/shared/ui';

import {
  auditFiltersSchema,
  type AuditFilterValues as FilterValues,
  auditSourceLabels,
} from '../constants';
import { AdminFieldGrid } from './AdminFieldGrid';
import { AdminSelect, Field } from './Common';

interface AuditFiltersProps {
  values: FilterValues;
  onApply: (values: FilterValues) => void;
  onReset: () => void;
}
export const AuditFilters = ({
  values,
  onApply,
  onReset,
}: AuditFiltersProps) => {
  const form = useForm({
    resolver: zodResolver(auditFiltersSchema),
    defaultValues: values,
  });
  return (
    <form onSubmit={form.handleSubmit(onApply)} className="grid gap-4">
      <AdminFieldGrid className="xl:grid-cols-3">
        <Controller
          control={form.control}
          name="source"
          render={({ field }) => (
            <AdminSelect
              showLabel
              error={form.formState.errors.source?.message}
              label="Источник"
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: '', label: 'Все источники' },
                ...Object.entries(auditSourceLabels).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
          )}
        />
        {[
          { name: 'actor_id' as const, label: 'ID автора', max: 36 },
          { name: 'entity_type' as const, label: 'Тип объекта', max: 64 },
          { name: 'entity_id' as const, label: 'ID объекта', max: 128 },
          { name: 'action' as const, label: 'Действие', max: 64 },
        ].map(({ name, label, max }) => (
          <Field
            key={name}
            label={label}
            error={form.formState.errors[name]?.message}
          >
            <Input maxLength={max} {...form.register(name)} />
          </Field>
        ))}
        <Field label="С (Москва)" error={form.formState.errors.from?.message}>
          <Input type="datetime-local" step="1" {...form.register('from')} />
        </Field>
        <Field label="По (Москва)" error={form.formState.errors.to?.message}>
          <Input type="datetime-local" step="1" {...form.register('to')} />
        </Field>
      </AdminFieldGrid>
      <div className="flex flex-wrap gap-2">
        <Button>Применить</Button>
        <Button type="button" variant="outline" onClick={onReset}>
          Сбросить
        </Button>
      </div>
    </form>
  );
};
