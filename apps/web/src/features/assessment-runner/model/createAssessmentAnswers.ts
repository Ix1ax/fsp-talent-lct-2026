import type { AssessmentAttempt } from '@/entities/assessment';
import { saveAssessmentAnswer } from '@/entities/assessment';

import { createAnswerSchema } from '../constants';
import { createAnswerQueue } from './createAnswerQueue';
import type { AttemptStore } from './createAttemptStore';

export const createAssessmentAnswers = (
  initial: AssessmentAttempt,
  store: AttemptStore,
) => {
  const questions = new Map(
    initial.questions.map((question) => [question.id, question]),
  );

  const queue = createAnswerQueue({
    onChange: store.answersChanged,
    save: async (questionId, answer) => {
      if (!store.canSave()) return false;
      const question = questions.get(questionId);
      if (!question) return false;
      const validation = createAnswerSchema(question).safeParse({
        selected: answer.selected ?? [],
        text: answer.text ?? '',
      });
      if (!validation.success) return false;
      try {
        await saveAssessmentAnswer(initial.id, questionId, answer);
        return true;
      } catch (error) {
        store.handleError(
          error,
          'Не удалось сохранить ответ. Повторите отправку.',
        );
        return false;
      }
    },
  });
  initial.questions.forEach((question) =>
    queue.initialize(
      question.id,
      question.prompt.options?.length
        ? { selected: question.answer?.selected ?? [] }
        : { text: question.answer?.text ?? '' },
    ),
  );

  return queue;
};
