import { z } from 'zod';

import type { AssessmentQuestion } from '@/entities/assessment';

export const createAnswerSchema = (question: AssessmentQuestion) =>
  z.object({
    selected: z.array(z.string()).refine((ids) => {
      const options = question.prompt.options ?? [];
      return (
        ids.every((id) => options.some((option) => option.id === id)) &&
        (question.multiple || ids.length <= 1)
      );
    }, 'Выберите допустимый вариант.'),
    text: z.string().max(500, 'Максимум 500 символов.'),
  });

export type AnswerFormValues = { selected: string[]; text: string };
