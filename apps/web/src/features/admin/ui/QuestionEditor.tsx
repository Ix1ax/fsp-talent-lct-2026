import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { useFormUnsavedChanges } from '@/shared/hooks';
import { Button, Checkbox, Input, Textarea } from '@/shared/ui';
import { adminRequest, adminSchemas, type Question } from '@/entities/admin';

import { questionFormSchema } from '../constants';
import { questionContent } from '../lib';
import {
  type QuestionFormValues,
  useAdminMutation,
  useAdminSession,
} from '../model';
import { AdminFieldGrid } from './AdminFieldGrid';
import { AdminPanel } from './AdminPanel';
import { AdminSelect, ErrorNotice, Field, SkillPicker } from './Common';
import { DifficultyPicker, QuestionKindPicker } from './QuestionKindPicker';
import { QuestionLivePreview } from './QuestionLivePreview';
import { QuestionOptionsEditor } from './QuestionOptionsEditor';

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
    <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <AdminPanel>
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold">
            {question ? 'Новая версия задания' : 'Новое задание'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Сохранение создаёт черновик. Публикация доступна в карточке задания.
          </p>
        </div>
        <form onSubmit={submit} className="grid min-w-0 gap-6">
          <fieldset disabled={mutation.busy} className="grid min-w-0 gap-6">
            <AdminFieldGrid>
              <Controller
                control={form.control}
                name="skill_id"
                render={({ field }) => (
                  <SkillPicker
                    approvedOnly
                    error={form.formState.errors.skill_id?.message}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={!!question}
                  />
                )}
              />
              <Field
                label="Сложность"
                error={form.formState.errors.difficulty?.message}
              >
                <Controller
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <DifficultyPicker
                      value={field.value}
                      disabled={!!question}
                      onChange={field.onChange}
                    />
                  )}
                />
              </Field>
            </AdminFieldGrid>
            <div className="grid gap-2">
              <p className="text-sm font-medium">Тип задания</p>
              <Controller
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <QuestionKindPicker
                    value={field.value}
                    disabled={!!question}
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
            </div>
            <Field
              label="Текст вопроса"
              error={form.formState.errors.text?.message}
              reserveErrorSpace={false}
            >
              <Textarea
                rows={3}
                placeholder="Сформулируйте вопрос так, чтобы на него был однозначный ответ"
                {...form.register('text')}
              />
            </Field>
            {kind === 'code_reading' && (
              <div className="grid gap-4 rounded-xl border border-border bg-muted/40 p-4">
                <Field
                  label="Код"
                  error={form.formState.errors.code?.message}
                  reserveErrorSpace={false}
                >
                  <Textarea
                    className="bg-card font-mono"
                    rows={6}
                    spellCheck={false}
                    {...form.register('code')}
                  />
                </Field>
                <AdminFieldGrid>
                  <Field
                    label="Язык (необязательно)"
                    error={form.formState.errors.language?.message}
                  >
                    <Input
                      placeholder="Например, go"
                      {...form.register('language')}
                    />
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
                </AdminFieldGrid>
              </div>
            )}
            {grading === 'choice' ? (
              <QuestionOptionsEditor form={form} />
            ) : (
              <div className="grid gap-3">
                <Field
                  label="Принимаемые ответы — каждый с новой строки"
                  error={form.formState.errors.accepted?.message}
                  reserveErrorSpace={false}
                >
                  <Textarea
                    rows={3}
                    placeholder={'git rebase\nrebase'}
                    {...form.register('accepted')}
                  />
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
              </div>
            )}
            <ErrorNotice error={mutation.error} />
            <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t border-border bg-card/95 p-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:px-6 lg:-mx-8 lg:-mb-8 lg:px-8">
              <Button type="button" variant="outline" onClick={close}>
                Отмена
              </Button>
              <Button className="min-w-44">
                {mutation.busy ? 'Сохраняем…' : 'Сохранить черновик'}
              </Button>
            </div>
          </fieldset>
        </form>
      </AdminPanel>
      <QuestionLivePreview
        control={form.control}
        skillName={question?.skill_name}
      />
    </div>
  );
};
