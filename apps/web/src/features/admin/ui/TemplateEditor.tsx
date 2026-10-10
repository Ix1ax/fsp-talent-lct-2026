import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, Trash2Icon } from 'lucide-react';
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
import { DifficultyPicker } from './QuestionKindPicker';

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
  const timeLimit = useWatch({ control: form.control, name: 'time_limit_sec' });
  const passScore = useWatch({ control: form.control, name: 'pass_score' });
  const questionTotal = blueprint.reduce(
    (sum, row) => sum + (Number(row.question_count) || 0),
    0,
  );
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
              label="Время на тест, минут (5–240)"
              error={form.formState.errors.time_limit_sec?.message}
            >
              {/* API хранит секунды, администратору удобнее минуты. */}
              <Controller
                control={form.control}
                name="time_limit_sec"
                render={({ field }) => (
                  <Input
                    type="number"
                    min={5}
                    max={240}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={
                      Number.isFinite(field.value)
                        ? Math.round(field.value / 60)
                        : ''
                    }
                    onChange={(event) =>
                      field.onChange(
                        event.target.value === ''
                          ? Number.NaN
                          : Math.round(Number(event.target.value) * 60),
                      )
                    }
                  />
                )}
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
              <ul
                aria-label="Сводка теста"
                className="flex flex-wrap gap-1.5 text-xs font-medium"
              >
                <li className="rounded-full bg-accent px-2.5 py-1 text-brand-text">
                  {questionTotal} вопр.
                </li>
                <li className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                  {Number.isFinite(timeLimit) ? Math.round(timeLimit / 60) : '—'}{' '}
                  мин
                </li>
                <li className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                  проходной {Number.isFinite(passScore) ? passScore : '—'}%
                </li>
              </ul>
            </div>
            {rows.fields.map((row, index) => (
              <div
                key={row.id}
                className="grid min-w-0 gap-3 rounded-xl border border-border bg-muted/30 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Блок {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Удалить блок ${index + 1}`}
                    title="Удалить блок"
                    disabled={rows.fields.length <= 1}
                    onClick={() => rows.remove(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2Icon />
                  </Button>
                </div>
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
                    <Controller
                      control={form.control}
                      name={`blueprint.${index}.difficulty`}
                      render={({ field }) => (
                        <DifficultyPicker
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
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
              </div>
            ))}
            {(form.formState.errors.blueprint?.message ??
              form.formState.errors.blueprint?.root?.message) && (
              <p role="alert" className="text-sm text-destructive">
                {form.formState.errors.blueprint?.message ??
                  form.formState.errors.blueprint?.root?.message}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              className="justify-self-start border-dashed"
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
              <PlusIcon aria-hidden="true" />
              Добавить блок навыка
            </Button>
          </section>
          <ErrorNotice error={mutation.error} />
          <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t border-border bg-card/95 p-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:px-6 lg:-mx-8 lg:-mb-8 lg:px-8">
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
