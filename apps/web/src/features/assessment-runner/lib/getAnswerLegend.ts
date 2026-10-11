import type { AssessmentQuestion } from '@/entities/assessment';

export const getAnswerLegend = (question: AssessmentQuestion): string => {
  if (!question.prompt.options?.length) return 'Ваш ответ';
  if (question.multiple) return 'Выберите несколько вариантов';

  return 'Выберите один вариант';
};
