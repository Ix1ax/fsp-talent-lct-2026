import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useDebounce } from '@/shared/hooks';
import { Button, Checkbox, Textarea } from '@/shared/ui';
import type {
  AssessmentAnswer,
  AssessmentQuestion,
} from '@/entities/assessment';

import { type AnswerFormValues, createAnswerSchema } from '../constants';
import { getAnswerLegend, getAnswerStatus } from '../lib';
import type { AnswerState } from '../model';

interface QuestionAnswerFormProps {
  question: AssessmentQuestion;
  state: AnswerState;
  disabled: boolean;
  onChange: (answer: AssessmentAnswer) => void;
  onSave: () => Promise<boolean>;
}

export const QuestionAnswerForm = ({
  question,
  state,
  disabled,
  onChange,
  onSave,
}: QuestionAnswerFormProps) => {
  const form = useForm<AnswerFormValues>({
    resolver: zodResolver(createAnswerSchema(question)),
    defaultValues: {
      selected: state.answer.selected ?? [],
      text: state.answer.text ?? '',
    },
  });

  const { debounce, cancel } = useDebounce(() => {
    void onSave();
  }, 500);

  const selected = useWatch({ control: form.control, name: 'selected' });
  const options = question.prompt.options ?? [];

  const choose = (id: string, checked: boolean) => {
    const next = question.multiple
      ? selected.filter((value) => value !== id).concat(checked ? [id] : [])
      : [id];
    form.setValue('selected', next, { shouldValidate: true });
    onChange({ selected: next });
    void onSave();
  };

  return (
    <form
      onSubmit={form.handleSubmit(() => {
        cancel();
        void onSave();
      })}
      className="flex min-w-0 flex-col gap-3"
    >
      <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-3">
        <legend className="mb-3 text-sm font-medium">
          {getAnswerLegend(question)}
        </legend>
        {options.map((option) => (
          <label
            key={option.id}
            className="flex min-h-12 min-w-0 cursor-pointer items-start gap-3 rounded-lg border p-3 wrap-anywhere transition-colors has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:ring-2 has-focus-visible:ring-ring"
          >
            {question.multiple ? (
              <Checkbox
                checked={selected.includes(option.id)}
                onCheckedChange={(checked) =>
                  choose(option.id, checked === true)
                }
              />
            ) : (
              <input
                type="radio"
                name={`answer-${question.id}`}
                checked={selected.includes(option.id)}
                onChange={() => choose(option.id, true)}
                className="mt-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
            )}
            <span className="min-w-0 whitespace-pre-wrap">{option.text}</span>
          </label>
        ))}
        {!options.length && (
          <Textarea
            aria-label="Текст ответа"
            maxLength={500}
            {...form.register('text', {
              onChange: (event) => {
                onChange({ text: event.target.value });
                debounce();
              },
              onBlur: () => {
                cancel();
                void onSave();
              },
            })}
          />
        )}
        {form.formState.errors.text && (
          <p role="alert">{form.formState.errors.text.message}</p>
        )}
      </fieldset>
      <p role="status" className="min-h-5 text-sm text-muted-foreground">
        {getAnswerStatus(state)}
      </p>
      {state.error && (
        <Button
          type="submit"
          variant="outline"
          disabled={disabled || state.saving}
        >
          Повторить отправку
        </Button>
      )}
    </form>
  );
};
