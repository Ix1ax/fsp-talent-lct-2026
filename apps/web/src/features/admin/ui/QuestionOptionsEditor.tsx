import {
  Controller,
  useFieldArray,
  type UseFormReturn,
  useWatch,
} from 'react-hook-form';
import { CheckIcon, PlusIcon, Trash2Icon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { Button, Input, Switch } from '@/shared/ui';

import type { QuestionFormValues } from '../model';

interface QuestionOptionsEditorProps {
  form: UseFormReturn<QuestionFormValues>;
}

const MAX_OPTIONS = 10;

// Служебный код варианта нужен только для проверки ответа, поэтому
// администратор видит букву по порядку, а код подбирается сам.
const nextOptionId = (ids: Set<string>, count: number) =>
  'abcdefghij'.split('').find((letter) => !ids.has(letter)) ??
  `o${count + 1}`;

const letter = (index: number) => String.fromCharCode(65 + index);

export const QuestionOptionsEditor = ({ form }: QuestionOptionsEditorProps) => {
  const rows = useFieldArray({ control: form.control, name: 'options' });
  const multiple = useWatch({ control: form.control, name: 'multiple' });
  const options = useWatch({ control: form.control, name: 'options' });
  const errors = form.formState.errors.options;

  // Меняем только флаги: ключи строк сохраняются, поля не перемонтируются.
  const setCorrect = (flags: boolean[]) => {
    flags.forEach((correct, index) =>
      form.setValue(`options.${index}.correct`, correct, { shouldDirty: true }),
    );
    if (form.formState.isSubmitted) void form.trigger('options');
  };

  const toggleCorrect = (index: number) => {
    const current = form.getValues('options');
    setCorrect(
      current.map((option, position) => {
        if (position === index) return !option.correct;
        // Одиночный выбор: отмеченный вариант снимает отметку с остальных.
        return multiple ? option.correct : false;
      }),
    );
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h3 className="font-medium">Варианты ответа</h3>
          <p className="text-sm text-muted-foreground">
            Нажмите на букву, чтобы отметить правильный вариант.
          </p>
        </div>
        <Controller
          control={form.control}
          name="multiple"
          render={({ field }) => (
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
              <Switch
                checked={field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  // При переходе к одиночному выбору оставляем один верный.
                  if (!checked) {
                    const current = form.getValues('options');
                    const first = current.findIndex((option) => option.correct);
                    setCorrect(current.map((_, index) => index === first));
                  }
                }}
              />
              Несколько верных
            </label>
          )}
        />
      </div>

      <ol className="grid gap-2">
        {rows.fields.map((row, index) => {
          const correct = options?.[index]?.correct ?? false;
          const textError = errors?.[index]?.text?.message;
          return (
            <li key={row.id} className="grid gap-1">
              <div
                className={cn(
                  'flex min-w-0 items-center gap-2 rounded-xl border p-1.5 pr-1 transition-colors',
                  correct
                    ? 'border-success/40 bg-success-soft'
                    : 'border-border bg-card',
                  textError && 'border-destructive/50',
                )}
              >
                <button
                  type="button"
                  role={multiple ? 'checkbox' : 'radio'}
                  aria-checked={correct}
                  aria-label={`Вариант ${letter(index)} — правильный`}
                  title={correct ? 'Правильный ответ' : 'Отметить правильным'}
                  onClick={() => toggleCorrect(index)}
                  className={cn(
                    'flex size-9 min-h-9! shrink-0 items-center justify-center text-sm font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    multiple ? 'rounded-lg' : 'rounded-full',
                    correct
                      ? 'bg-success text-white dark:text-background'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-brand-text',
                  )}
                >
                  {correct ? (
                    <CheckIcon aria-hidden="true" className="size-4" />
                  ) : (
                    letter(index)
                  )}
                </button>
                <Input
                  aria-label={`Текст варианта ${letter(index)}`}
                  placeholder={`Вариант ${letter(index)}`}
                  aria-invalid={!!textError}
                  aria-describedby={
                    textError ? `${row.id}-text-error` : undefined
                  }
                  className="min-w-0 flex-1 border-transparent bg-transparent shadow-none focus-visible:border-ring focus-visible:bg-background"
                  {...form.register(`options.${index}.text`)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Удалить вариант ${letter(index)}`}
                  title="Удалить вариант"
                  disabled={rows.fields.length <= 2}
                  onClick={() => rows.remove(index)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2Icon />
                </Button>
              </div>
              {textError && (
                <p
                  id={`${row.id}-text-error`}
                  role="alert"
                  className="pl-12 text-xs text-destructive"
                >
                  {textError}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {(errors?.message ?? errors?.root?.message) && (
        <p role="alert" className="text-sm text-destructive">
          {errors?.message ?? errors?.root?.message}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        className="justify-self-start border-dashed"
        disabled={rows.fields.length >= MAX_OPTIONS}
        onClick={() => {
          const ids = new Set(form.getValues('options').map((o) => o.id));
          rows.append({
            id: nextOptionId(ids, rows.fields.length),
            text: '',
            correct: false,
          });
        }}
      >
        <PlusIcon aria-hidden="true" />
        Добавить вариант
      </Button>
    </section>
  );
};
