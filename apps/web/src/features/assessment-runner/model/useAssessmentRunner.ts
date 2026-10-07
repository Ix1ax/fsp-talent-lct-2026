import { useEffect, useRef, useState } from 'react';

import { ApiError } from '@/shared/api';
import { useCountdown, useUnsavedChanges } from '@/shared/hooks';
import {
  type AssessmentAnswer,
  type AssessmentAttempt,
  getAssessmentAttempt,
  saveAssessmentAnswer,
  submitAssessment,
} from '@/entities/assessment';

import { createAnswerSchema } from '../constants';
import { createAnswerQueue } from './createAnswerQueue';

export const useAssessmentRunner = (initial: AssessmentAttempt) => {
  const [attempt, setAttempt] = useState(initial);
  const [, render] = useState(0);
  const { timeLeft: remaining } = useCountdown(
    initial.timeLimitSec,
    initial.deadlineAt,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lifecycle] = useState(() => {
    let active = true;
    return {
      isActive: () => active,
      activate: () => {
        active = true;
      },
      deactivate: () => {
        active = false;
      },
    };
  });

  const submitting = useRef(false);
  const [queue] = useState(() => {
    const instance = createAnswerQueue({
      save: async (questionId, answer) => {
        try {
          const question = initial.questions.find(
            (item) => item.id === questionId,
          );
          if (!question) throw new Error('Question not found');
          createAnswerSchema(question).parse({
            selected: answer.selected ?? [],
            text: answer.text ?? '',
          });
          await saveAssessmentAnswer(initial.id, questionId, answer);
        } catch (err) {
          if (
            lifecycle.isActive() &&
            err instanceof ApiError &&
            err.code === 'attempt_closed'
          ) {
            void getAssessmentAttempt(initial.id)
              .then((next) => {
                if (lifecycle.isActive()) setAttempt(next);
              })
              .catch(() => {
                if (lifecycle.isActive())
                  setError(
                    'Попытка закрыта. Обновите страницу для получения результата.',
                  );
              });
          }
          if (
            lifecycle.isActive() &&
            err instanceof ApiError &&
            err.code === 'consent_required'
          )
            setError(
              'Согласие на обработку данных отозвано. Сохранение недоступно.',
            );
          throw err;
        }
      },
      onChange: () => {
        if (lifecycle.isActive()) render((value) => value + 1);
      },
    });
    initial.questions.forEach((question) =>
      instance.initialize(
        question.id,
        question.prompt.options?.length
          ? { selected: question.answer?.selected ?? [] }
          : { text: question.answer?.text ?? '' },
      ),
    );
    return instance;
  });
  useUnsavedChanges(!attempt.result && queue.dirty());
  useEffect(() => {
    lifecycle.activate();
    return () => {
      lifecycle.deactivate();
    };
  }, [lifecycle]);
  useEffect(() => {
    if (remaining > 0 || attempt.result) return;
    const controller = new AbortController();
    void getAssessmentAttempt(attempt.id, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setAttempt(next);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            'Время истекло. Не удалось получить итог. Обновите страницу.',
          );
      });
    return () => controller.abort();
  }, [remaining, attempt.id, attempt.result]);
  const finish = async () => {
    if (submitting.current) return false;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      if (!(await queue.flushAll())) {
        setError(
          'Не все ответы сохранены. Повторите отправку перед завершением.',
        );
        return false;
      }
      const next = await submitAssessment(attempt.id);
      if (lifecycle.isActive()) setAttempt(next);
      return true;
    } catch {
      if (lifecycle.isActive())
        setError('Не удалось завершить тест. Попробуйте ещё раз.');
      return false;
    } finally {
      submitting.current = false;
      if (lifecycle.isActive()) setBusy(false);
    }
  };
  return {
    attempt,
    remaining,
    busy,
    error,
    queue,
    finish,
    update: (id: string, answer: AssessmentAnswer) => {
      if (!busy && remaining > 0) queue.update(id, answer);
    },
  };
};
