import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Button, Card, Input } from '@/shared/ui';
import { adminRequest, adminSchemas, type Template } from '@/entities/admin';

import { templateFormSchema, type TemplateFormValues } from '../constants';
import { useAdminSession } from '../model';
import { useAdminMutation } from '../model/useAdminMutation';
import { useAdminOptions } from '../model/useAdminOptions';
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
  const options = useAdminOptions();
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
      toast.success('Черновик шаблона создан');
      onSaved(saved.id);
    });
  });
  return (
    <Card className="min-w-0 gap-5 p-4 sm:p-6 lg:p-8">
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
                  label="Основной навык (стек)"
                  value={field.value}
                  onChange={field.onChange}
                  items={options.skills}
                />
              )}
            />
            <p className="min-h-5 text-sm text-destructive">
              {form.formState.errors.stack_skill_id?.message}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
          <section className="grid gap-4">
            <div className="flex items-center justify-between">
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
              <div key={row.id} className="grid gap-3 border p-4">
                <Controller
                  control={form.control}
                  name={`blueprint.${index}.skill_id`}
                  render={({ field }) => (
                    <SkillPicker
                      value={field.value}
                      onChange={field.onChange}
                      items={options.skills}
                    />
                  )}
                />
                <p className="min-h-5 text-sm text-destructive">
                  {form.formState.errors.blueprint?.[index]?.skill_id?.message}
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
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
                </div>
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
          <ErrorNotice error={options.error} />
          <ErrorNotice error={mutation.error} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button className="min-w-44" disabled={options.loading}>
              {mutation.busy ? 'Сохраняем…' : 'Сохранить черновик'}
            </Button>
          </div>
        </fieldset>
      </form>
    </Card>
  );
};
