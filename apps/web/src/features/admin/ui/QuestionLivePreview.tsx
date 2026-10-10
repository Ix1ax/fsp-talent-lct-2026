import { useState } from 'react';
import { type Control, useWatch } from 'react-hook-form';
import { EyeIcon } from 'lucide-react';

import type { PreviewAnswer, PreviewQuestion } from '@/entities/admin';

import type { QuestionFormValues } from '../model';
import { PreviewQuestionBody } from './PreviewQuestionBody';

interface QuestionLivePreviewProps {
  control: Control<QuestionFormValues>;
  skillName?: string;
}

/** Задание глазами кандидата — обновляется по мере ввода. */
export const QuestionLivePreview = ({
  control,
  skillName,
}: QuestionLivePreviewProps) => {
  const values = useWatch({ control });
  const [answer, setAnswer] = useState<PreviewAnswer>({});
  const grading = values.grading ?? 'choice';

  const question: PreviewQuestion = {
    id: 'live-preview',
    question_id: 'live-preview',
    position: 1,
    version: 1,
    skill_id: values.skill_id ?? '',
    skill_name: skillName || 'Навык не выбран',
    difficulty: values.difficulty ?? 1,
    weight: 1,
    kind: values.kind ?? 'choice',
    prompt: {
      text: values.text?.trim() || 'Текст вопроса появится здесь',
      code:
        values.kind === 'code_reading' ? values.code || undefined : undefined,
      language: values.language || undefined,
      options:
        grading === 'choice'
          ? (values.options ?? []).map((option, index) => ({
              id: option?.id || String(index),
              text: option?.text?.trim() || `Вариант ${index + 1}`,
            }))
          : undefined,
    },
    answer_form: { type: grading, multiple: values.multiple ?? false },
    answer: null,
  };

  return (
    <aside className="grid min-w-0 content-start gap-3 xl:sticky xl:top-24">
      <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <EyeIcon aria-hidden="true" className="size-4" />
        Так увидит кандидат
      </p>
      <div className="rounded-2xl border border-border bg-card p-2 shadow-xs">
        <PreviewQuestionBody
          question={question}
          answer={answer}
          finished={false}
          onChange={setAnswer}
        />
      </div>
    </aside>
  );
};
