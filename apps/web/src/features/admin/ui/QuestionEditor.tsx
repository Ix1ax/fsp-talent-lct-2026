import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { useFormUnsavedChanges } from '@/shared/hooks';
import { Button, Checkbox, Input, Textarea } from '@/shared/ui';
import {
  adminRequest,
  adminSchemas,
  kindLabels,
  type Question,
} from '@/entities/admin';

import {
  questionContent,
  questionFormSchema,
  type QuestionFormValues,
} from '../constants';
import { useAdminSession } from '../model';
import { useAdminMutation } from '../model/useAdminMutation';
import { useAdminOptions } from '../model/useAdminOptions';
import { AdminPanel } from './AdminPanel';
import { AdminSelect, ErrorNotice, Field, SkillPicker } from './Common';

interface QuestionEditorProps {
  question?: Question;
  onClose: () => void;
  onSaved: (id: string) => void;
}
export const QuestionEditor = ({
  question,
  onClose,
  onSaved,
}: QuestionEditorProps) => {
  const { session } = useAdminSession();
  const options = useAdminOptions();
  const mutation = useAdminMutation();
  const version = question?.versions?.find(
    (item) => item.version === question.latest_version,
  );
  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      skill_id: question?.skill_id ?? '',
      difficulty: question?.difficulty ?? 1,
      kind: question?.kind ?? 'choice',
      text: version?.prompt.text ?? '',
      code: version?.prompt.code ?? '',
      language: version?.prompt.language ?? '',
      grading: version?.grading_spec.type ?? 'choice',
      options: version?.prompt.options?.map((o) => ({
        ...o,
        correct: version.grading_spec.correct?.includes(o.id) ?? false,
      })) ?? [
        { id: 'a', text: '', correct: true },
        { id: 'b', text: '', correct: false },
      ],
      multiple: version?.grading_spec.multiple ?? false,
      accepted: version?.grading_spec.accepted?.join('\n') ?? '',
      case_sensitive: version?.grading_spec.case_sensitive ?? false,
    },
  });
  const unsaved = useFormUnsavedChanges(form);
  const close = () => {
    if (!mutation.busy) unsaved.discard(onClose);
  };
  const rows = useFieldArray({ control: form.control, name: 'options' });
  const kind = useWatch({ control: form.control, name: 'kind' });
  const grading = useWatch({ control: form.control, name: 'grading' });
  const submit = form.handleSubmit(async (values) => {
    const content = questionContent(values);
    await mutation.run(async () => {
      let savedId = question?.id;
      if (question) {
        await adminRequest(
          session!.access_token,
          `/assessments/questions/${question.id}/versions`,
          adminSchemas.version,
          { method: 'POST', body: content },
        );
      } else {
        const saved = await adminRequest(
          session!.access_token,
          '/assessments/questions',
          adminSchemas.question,
          {
            method: 'POST',
            body: {
              skill_id: values.skill_id,
              difficulty: values.difficulty,
              kind: values.kind,
              ...content,
            },
          },
        );
        savedId = saved.id;
      }
      form.reset(form.getValues());
      unsaved.markSaved();
      toast.success('Черновик версии создан');
      onSaved(savedId!);
    });
  });
  return (
    <AdminPanel>
      <h1 className="text-2xl font-semibold">
        {question ? 'Новая версия задания' : 'Новое задание'}
      </h1>
      <p className="text-sm text-muted-foreground">
        Сохранение создаёт черновик. Публикация доступна в карточке задания.
      </p>
      <form onSubmit={submit} className="grid min-w-0 gap-5">
        <fieldset disabled={mutation.busy} className="grid min-w-0 gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Controller
                control={form.control}
                name="skill_id"
                render={({ field }) => (
                  <SkillPicker
                    value={field.value}
                    onChange={field.onChange}
                    items={options.skills}
                    disabled={!!question || options.loading}
                  />
                )}
              />
              <p className="mt-1 min-h-5 text-sm text-destructive">
                {form.formState.errors.skill_id?.message}
              </p>
            </div>
            <Field
              label="Сложность (1–5)"
              error={form.formState.errors.difficulty?.message}
            >
              <Input
                type="number"
                min={1}
                max={5}
                readOnly={!!question}
                {...form.register('difficulty', { valueAsNumber: true })}
              />
            </Field>
          </div>
          <Field label="Тип задания">
            <Controller
              control={form.control}
              name="kind"
              render={({ field }) => (
                <AdminSelect
                  label="Тип задания"
                  value={field.value}
                  disabled={!!question}
                  options={Object.entries(kindLabels).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                  onChange={(value) => {
                    field.onChange(value);
                    if (value === 'choice') form.setValue('grading', 'choice');
                    if (value === 'short_answer')
                      form.setValue('grading', 'text');
                  }}
                />
              )}
            />
          </Field>
          <Field
            label="Текст вопроса"
            error={form.formState.errors.text?.message}
          >
            <Textarea rows={4} {...form.register('text')} />
          </Field>
          {kind === 'code_reading' && (
            <>
              <Field label="Код" error={form.formState.errors.code?.message}>
                <Textarea
                  className="font-mono"
                  rows={6}
                  {...form.register('code')}
                />
              </Field>
              <Field
                label="Язык (необязательно)"
                error={form.formState.errors.language?.message}
              >
                <Input {...form.register('language')} />
              </Field>
              <Field label="Проверка ответа">
                <Controller
                  control={form.control}
                  name="grading"
                  render={({ field }) => (
                    <AdminSelect
                      label="Проверка ответа"
                      value={field.value}
                      onChange={field.onChange}
                      options={[
                        { value: 'choice', label: 'Выбор ответа' },
                        { value: 'text', label: 'Текстовый ответ' },
                      ]}
                    />
                  )}
                />
              </Field>
            </>
          )}
          {grading === 'choice' ? (
            <section className="grid gap-3">
              <h3 className="font-medium">Варианты ответа</h3>
              <p className="text-sm text-muted-foreground">
                Отметьте правильные ответы.
              </p>
              <Controller
                control={form.control}
                name="multiple"
                render={({ field }) => (
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(v === true)}
                    />
                    Несколько правильных ответов
                  </label>
                )}
              />
              {rows.fields.map((row, index) => (
                <div
                  key={row.id}
                  className="grid min-w-0 grid-cols-[auto_5rem_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[auto_5rem_minmax(0,1fr)_auto]"
                >
                  <Controller
                    control={form.control}
                    name={`options.${index}.correct`}
                    render={({ field }) => (
                      <label className="flex size-11 cursor-pointer items-center justify-center">
                        <Checkbox
                          aria-label={`Правильный ответ ${index + 1}`}
                          checked={field.value}
                          onCheckedChange={(v) => field.onChange(v === true)}
                        />
                      </label>
                    )}
                  />
                  <Input
                    aria-label={`Код варианта ${index + 1}`}
                    className="w-full"
                    {...form.register(`options.${index}.id`)}
                  />
                  <Input
                    aria-label={`Текст варианта ${index + 1}`}
                    className="col-span-3 row-start-2 min-w-0 sm:col-span-1 sm:col-start-3 sm:row-start-1"
                    {...form.register(`options.${index}.text`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="col-start-3 row-start-1 justify-self-end sm:col-start-4"
                    disabled={rows.fields.length <= 2}
                    onClick={() => rows.remove(index)}
                  >
                    Убрать
                  </Button>
                </div>
              ))}
              <p className="min-h-5 text-sm text-destructive">
                {form.formState.errors.options?.message}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={rows.fields.length >= 10}
                onClick={() => {
                  const ids = new Set(
                    form.getValues('options').map((o) => o.id),
                  );
                  const id =
                    'abcdefghij'.split('').find((s) => !ids.has(s)) ??
                    `o${rows.fields.length + 1}`;
                  rows.append({ id, text: '', correct: false });
                }}
              >
                Добавить вариант
              </Button>
            </section>
          ) : (
            <>
              <Field
                label="Принимаемые ответы — каждый с новой строки"
                error={form.formState.errors.accepted?.message}
              >
                <Textarea rows={4} {...form.register('accepted')} />
              </Field>
              <Controller
                control={form.control}
                name="case_sensitive"
                render={({ field }) => (
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(v === true)}
                    />
                    Учитывать регистр
                  </label>
                )}
              />
            </>
          )}
          <ErrorNotice error={options.error} />
          <ErrorNotice error={mutation.error} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={close}>
              Отмена
            </Button>
            <Button
              className="min-w-44"
              disabled={options.loading && !question}
            >
              {mutation.busy ? 'Сохраняем…' : 'Сохранить черновик'}
            </Button>
          </div>
        </fieldset>
      </form>
    </AdminPanel>
  );
};
