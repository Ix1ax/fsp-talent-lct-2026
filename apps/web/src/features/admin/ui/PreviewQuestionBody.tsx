import { Checkbox } from '@/shared/ui';
import type { PreviewAnswer, PreviewQuestion } from '@/entities/admin';

import { PreviewTextAnswer } from './PreviewTextAnswer';

interface PreviewQuestionBodyProps {
  question: PreviewQuestion;
  answer: PreviewAnswer;
  finished: boolean;
  onChange: (answer: PreviewAnswer) => void;
}
export const PreviewQuestionBody = ({
  question,
  answer,
  finished,
  onChange,
}: PreviewQuestionBodyProps) => {
  const { prompt, answer_form: grading } = question;
  return (
    <section className="grid min-w-0 min-h-64 content-start gap-4 rounded-lg border p-4">
      <p className="text-xs text-caption">
        {question.skill_name} · Сложность {question.difficulty} · Версия{' '}
        {question.version}
      </p>
      <h3 className="max-w-prose whitespace-pre-wrap text-base font-medium wrap-anywhere">
        {prompt.text}
      </h3>
      {prompt.code && (
        <pre
          tabIndex={0}
          aria-label="Код задания"
          className="min-w-0 max-w-full overflow-x-auto rounded-md bg-muted p-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
        >
          <code>{prompt.code}</code>
        </pre>
      )}
      <fieldset disabled={finished} className="grid min-w-0 gap-3">
        <legend className="mb-3 text-sm text-muted-foreground">
          {grading.type === 'text'
            ? 'Введите ответ'
            : grading.multiple
              ? 'Выберите все правильные ответы'
              : 'Выберите один ответ'}
        </legend>
        {grading.type === 'choice' ? (
          prompt.options?.map((option) => (
            <label
              key={option.id}
              className="flex min-h-12 min-w-0 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:ring-2 has-focus-visible:ring-ring"
            >
              <Checkbox
                aria-label={option.text}
                checked={(answer.selected ?? []).includes(option.id)}
                onCheckedChange={(checked) => {
                  const selected = grading.multiple
                    ? (answer.selected ?? [])
                        .filter((id) => id !== option.id)
                        .concat(checked === true ? [option.id] : [])
                    : checked === true
                      ? [option.id]
                      : [];
                  onChange({ selected });
                }}
              />
              <span className="min-w-0 whitespace-pre-wrap wrap-anywhere">
                {option.text}
              </span>
            </label>
          ))
        ) : (
          <PreviewTextAnswer
            key={question.id}
            value={answer.text ?? ''}
            onChange={(text) => onChange({ text })}
          />
        )}
      </fieldset>
    </section>
  );
};
