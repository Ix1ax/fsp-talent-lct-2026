import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { useFormUnsavedChanges } from '@/shared/hooks';
import { Button, Input } from '@/shared/ui';
import { adminRequest, adminSchemas, type Template } from '@/entities/admin';

import { templateFormSchema } from '../constants';
import {
  type TemplateFormValues,
  useAdminMutation,
  useAdminOptions,
  useAdminSession,
} from '../model';
import { AdminFieldGrid } from './AdminFieldGrid';
import { AdminPanel } from './AdminPanel';
import { AdminSelect, ErrorNotice, Field, SkillPicker } from './Common';
import { TemplateBlueprint } from './TemplateBlueprint';

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
          <TemplateBlueprint
            form={form}
            rows={rows}
            questionTotal={questionTotal}
            timeLimit={timeLimit}
            passScore={passScore}
          />
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
