import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
  Textarea,
} from '@/shared/ui';
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
import { AdminSelect, ErrorNotice, Field, SkillPicker } from './Common';

interface QuestionEditorProps {
  question?: Question;
  onClose: () => void;
  onSaved: () => void;
}
export const QuestionEditor = ({
  question,
  onClose,
  onSaved,
}: QuestionEditorProps) => {
  const { session } = useAdminSession();
  const options = useAdminOptions();
  const mutation = useAdminMutation(onSaved);
  const version = question?.versions?.[0];
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
  const rows = useFieldArray({ control: form.control, name: 'options' });
  const kind = useWatch({ control: form.control, name: 'kind' });
  const grading = useWatch({ control: form.control, name: 'grading' });
  const submit = form.handleSubmit(async (values) => {
    const content = questionContent(values);
    await mutation.run(async () => {
      if (question)
        await adminRequest(
          session!.access_token,
          `/assessments/questions/${question.id}/versions`,
          adminSchemas.version,
          { method: 'POST', body: content },
        );
      else
        await adminRequest(
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
      toast.success('Черновик версии создан');
      onSaved();
      onClose();
    });
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.busy) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
        showCloseButton={!mutation.busy}
      >
        <DialogTitle>
          {question ? 'Новая версия задания' : 'Новое задание'}
        </DialogTitle>
        <DialogDescription>
          Сохранение создаёт черновик. Публикация доступна в карточке задания.
        </DialogDescription>
        <form onSubmit={submit} className="grid gap-5">
          <fieldset disabled={mutation.busy} className="grid gap-5">
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
                <p className="mt-1 text-sm text-destructive">
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
                    options={Object.entries(kindLabels).map(
                      ([value, label]) => ({ value, label }),
                    )}
                    onChange={(value) => {
                      field.onChange(value);
                      if (value === 'choice')
                        form.setValue('grading', 'choice');
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
                  Отметьте правильные ответы. ID сохраняет связь с проверкой.
                </p>
                <Controller
                  control={form.control}
                  name="multiple"
                  render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm">
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
                    className="flex flex-wrap items-start gap-2"
                  >
                    <Controller
                      control={form.control}
                      name={`options.${index}.correct`}
                      render={({ field }) => (
                        <Checkbox
                          aria-label={`Правильный ответ ${index + 1}`}
                          className="mt-3"
                          checked={field.value}
                          onCheckedChange={(v) => field.onChange(v === true)}
                        />
                      )}
                    />
                    <Input
                      aria-label={`ID варианта ${index + 1}`}
                      className="w-20"
                      {...form.register(`options.${index}.id`)}
                    />
                    <Input
                      aria-label={`Текст варианта ${index + 1}`}
                      className="min-w-40 flex-1"
                      {...form.register(`options.${index}.text`)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={rows.fields.length <= 2}
                      onClick={() => rows.remove(index)}
                    >
                      Убрать
                    </Button>
                  </div>
                ))}
                <p className="text-sm text-destructive">
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
                    <label className="flex items-center gap-2 text-sm">
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
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button disabled={options.loading && !question}>
                {mutation.busy ? 'Сохраняем…' : 'Сохранить черновик'}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
};
