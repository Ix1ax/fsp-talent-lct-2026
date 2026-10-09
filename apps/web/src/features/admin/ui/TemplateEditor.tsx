import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { useFormUnsavedChanges } from '@/shared/hooks';
import { Button, Input } from '@/shared/ui';
import { adminRequest, adminSchemas, type Template } from '@/entities/admin';

import { templateFormSchema } from '../constants';
import type { TemplateFormValues } from '../model';
import { useAdminSession } from '../model';
import { useAdminMutation } from '../model/useAdminMutation';
import { useAdminOptions } from '../model/useAdminOptions';
import { AdminFieldGrid } from './AdminFieldGrid';
import { AdminPanel } from './AdminPanel';
import { AdminSelect, ErrorNotice, Field, SkillPicker } from './Common';

interface TemplateEditorProps {
  template?: Template;
  onClose: () => void;
  onSaved: (id: string) => void;
}
export const TemplateEditor = ({
  template,
  onClose,
  onSaved,
}: TemplateEditorProps) => {
  const { session } = useAdminSession();
  const options = useAdminOptions(['specializations', 'grades']);
  const mutation = useAdminMutation();
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      stack_skill_id: template?.stack_skill_id ?? '',
      specialization_id: template?.specialization_id ?? 0,
      grade_id: template?.grade_id ?? 0,
      time_limit_sec: template?.time_limit_sec ?? 1800,
      pass_score: template?.pass_score ?? 70,
      blueprint: template?.blueprint?.map(
        ({ skill_id, difficulty, question_count, weight }) => ({
          skill_id,
          difficulty,
          question_count,
          weight,
        }),
      ) ?? [{ skill_id: '', difficulty: 1, question_count: 5, weight: 1 }],
    },
  });
  const unsaved = useFormUnsavedChanges(form);
  const close = () => {
    if (!mutation.busy) unsaved.discard(onClose);
  };
  const rows = useFieldArray({ control: form.control, name: 'blueprint' });
  const blueprint = useWatch({ control: form.control, name: 'blueprint' });
  const submit = form.handleSubmit(async (values) => {
    await mutation.run(async () => {
      const saved = await adminRequest(
        session!.access_token,
        '/assessments/templates',
        adminSchemas.template,
        { method: 'POST', body: values },
      );
      form.reset(form.getValues());
      unsaved.markSaved();
      toast.success('Черновик шаблона создан');
      onSaved(saved.id);
    });
  });
  return (
    <AdminPanel>
      <h1 className="text-2xl font-semibold">
        {template ? 'Новая версия шаблона' : 'Новый шаблон теста'}
      </h1>
      <p className="text-sm text-muted-foreground">
        Сохранение создаст новый черновик. Недостаток заданий не мешает
        сохранить состав.
      </p>
      <form onSubmit={submit} className="grid min-w-0 gap-5">
        <fieldset disabled={mutation.busy} className="grid min-w-0 gap-5">
          <div>
            <Controller
              control={form.control}
              name="stack_skill_id"
              render={({ field }) => (
                <SkillPicker
                  approvedOnly
                  label="Основной навык (стек)"
                  error={form.formState.errors.stack_skill_id?.message}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
          <AdminFieldGrid>
            {(['specializations', 'grades'] as const).map((kind) => {
              const name = kind === 'grades' ? 'grade_id' : 'specialization_id';
              const label = kind === 'grades' ? 'Грейд' : 'Специализация';
              return (
                <Field
                  key={kind}
                  label={label}
                  error={form.formState.errors[name]?.message}
                >
                  <Controller
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <AdminSelect
                        label={label}
                        disabled={options.catalogs[kind]?.loading}
                        value={field.value ? String(field.value) : ''}
                        onChange={(v) => field.onChange(Number(v))}
                        options={[
                          { value: '', label: 'Выберите значение' },
                          ...(options.data[kind] ?? [])
                            .filter(
                              (s) =>
                                s.active !== false ||
                                s.id === String(field.value),
                            )
                            .map((s) => ({
                              value: s.id,
                              label: `${s.name}${s.active === false ? ' (архив)' : ''}`,
                            })),
                        ]}
                      />
                    )}
                  />
                </Field>
              );
            })}
            <Field
              label="Время, секунд (300–14400)"
              error={form.formState.errors.time_limit_sec?.message}
            >
              <Input
                type="number"
                {...form.register('time_limit_sec', { valueAsNumber: true })}
              />
            </Field>
            <Field
              label="Проходной балл, %"
              error={form.formState.errors.pass_score?.message}
            >
              <Input
                type="number"
                step="0.01"
                {...form.register('pass_score', { valueAsNumber: true })}
              />
            </Field>
          </AdminFieldGrid>
          {(['specializations', 'grades'] as const).map((kind) => (
            <ErrorNotice
              key={kind}
              error={options.catalogs[kind]?.error}
              onRetry={() => options.reload(kind)}
            />
          ))}
          <section className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">Состав теста</h3>
              <p className="text-sm text-muted-foreground">
                Вопросов:{' '}
                {blueprint.reduce(
                  (sum, row) => sum + (Number(row.question_count) || 0),
                  0,
                )}
              </p>
            </div>
            {rows.fields.map((row, index) => (
              <div
                key={row.id}
                className="grid min-w-0 gap-3 rounded-lg border p-4"
              >
                <Controller
                  control={form.control}
                  name={`blueprint.${index}.skill_id`}
                  render={({ field }) => (
                    <SkillPicker
                      error={
                        form.formState.errors.blueprint?.[index]?.skill_id
                          ?.message
                      }
                      approvedOnly
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />

                <AdminFieldGrid className="sm:grid-cols-3">
                  <Field
                    label="Сложность"
                    error={
                      form.formState.errors.blueprint?.[index]?.difficulty
                        ?.message
                    }
                  >
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      {...form.register(`blueprint.${index}.difficulty`, {
                        valueAsNumber: true,
                      })}
                    />
                  </Field>
                  <Field
                    label="Вопросов"
                    error={
                      form.formState.errors.blueprint?.[index]?.question_count
                        ?.message
                    }
                  >
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      {...form.register(`blueprint.${index}.question_count`, {
                        valueAsNumber: true,
                      })}
                    />
                  </Field>
                  <Field
                    label="Вес"
                    error={
                      form.formState.errors.blueprint?.[index]?.weight?.message
                    }
                  >
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register(`blueprint.${index}.weight`, {
                        valueAsNumber: true,
                      })}
                    />
                  </Field>
                </AdminFieldGrid>
                <Button
                  className="justify-self-end"
                  type="button"
                  variant="ghost"
                  disabled={rows.fields.length <= 1}
                  onClick={() => rows.remove(index)}
                >
                  Убрать строку
                </Button>
              </div>
            ))}
            <p className="min-h-5 text-sm text-destructive">
              {form.formState.errors.blueprint?.message ??
                form.formState.errors.blueprint?.root?.message}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={rows.fields.length >= 30}
              onClick={() =>
                rows.append({
                  skill_id: '',
                  difficulty: 1,
                  question_count: 5,
                  weight: 1,
                })
              }
            >
              Добавить строку
            </Button>
          </section>
          <ErrorNotice error={mutation.error} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={close}>
              Отмена
            </Button>
            <Button className="min-w-44" disabled={options.loading}>
              {mutation.busy ? 'Сохраняем…' : 'Сохранить черновик'}
            </Button>
          </div>
        </fieldset>
      </form>
    </AdminPanel>
  );
};
