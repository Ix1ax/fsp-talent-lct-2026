import { useState } from 'react';

import type { AssessmentQuestion } from '@/entities/assessment';

import type { createAnswerQueue } from './createAnswerQueue';
import {
  getQuestionProgress,
  hasAssessmentAnswer,
} from './getQuestionProgress';

type UseAssessmentNavigationOptions = {
  questions: AssessmentQuestion[];
  queue: ReturnType<typeof createAnswerQueue>;
  busy: boolean;
  locked: boolean;
};

export const useAssessmentNavigation = ({
  questions: initialQuestions,
  queue,
  busy,
  locked,
}: UseAssessmentNavigationOptions) => {
  const questions = [...initialQuestions].sort(
    (a, b) => a.position - b.position,
  );
  const [index, setIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  // При восстановлении попытки сервер уже подтверждает сохранённые ответы.
  const [reviewed, setReviewed] = useState(
    () =>
      new Set(
        questions
          .filter((item) => hasAssessmentAnswer(item.answer))
          .map((item) => item.id),
      ),
  );
  const question = questions[index];
  const progress = questions.map((item) =>
    getQuestionProgress(queue.get(item.id), reviewed.has(item.id)),
  );
  const completed = progress.filter((status) => status === 'complete').length;
  const unanswered = progress.filter((status) => status === 'empty').length;

  const leaveQuestion = () => {
    if (!question || locked) return;
    setReviewed((previous) => new Set(previous).add(question.id));
    void queue.flush(question.id);
  };

  const navigate = (next: number) => {
    if (
      busy ||
      next < 0 ||
      next >= questions.length ||
      (!reviewing && next === index)
    )
      return;
    if (!reviewing) leaveQuestion();
    setIndex(next);
    setReviewing(false);
  };

  const reviewAnswers = () => {
    if (busy || locked) return;
    leaveQuestion();
    setReviewing(true);
  };

  const invalidate = (id: string) => {
    setReviewed((previous) => {
      if (!previous.has(id)) return previous;
      const next = new Set(previous);
      next.delete(id);
      return next;
    });
  };

  return {
    questions,
    question,
    index,
    reviewing,
    progress,
    completed,
    unanswered,
    navigate,
    reviewAnswers,
    invalidate,
  };
};
