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
    <section className="grid min-w-0 min-h-64 content-start gap-4 border p-4">
      <p className="text-xs text-caption">
        {question.skill_name} · Сложность {question.difficulty} · Версия{' '}
        {question.version}
      </p>
      <h3 className="max-w-prose whitespace-pre-wrap text-base font-medium wrap-anywhere">
        {prompt.text}
      </h3>
      {prompt.code && (
        <pre className="min-w-0 overflow-x-auto bg-muted p-4 text-sm">
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
              className="flex cursor-pointer items-start gap-3 border p-3"
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
