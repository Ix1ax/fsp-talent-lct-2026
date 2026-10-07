import { getAssessmentAttempt, submitAssessment } from '@/entities/assessment';

import type { createAnswerQueue } from './createAnswerQueue';
import type { AttemptStore } from './createAttemptStore';

type ResultRefreshStatus = 'completed' | 'pending' | 'error' | 'busy';
type AnswerQueue = ReturnType<typeof createAnswerQueue>;

export const createAssessmentActions = (
  store: AttemptStore,
  queue: AnswerQueue,
) => {
  const refreshResult = async (
    signal?: AbortSignal,
  ): Promise<ResultRefreshStatus> => {
    if (store.getSnapshot().resultLoading) return 'busy';
    store.update({ resultLoading: true, error: '' });

    try {
      const next = await getAssessmentAttempt(
        store.getSnapshot().attempt.id,
        signal,
      );
      if (signal?.aborted) return 'error';
      store.apply(next);
      if (!next.result)
        store.update({
          error: 'Сервер ещё не завершил попытку. Повторите получение итога.',
        });
      return next.result ? 'completed' : 'pending';
    } catch (error) {
      if (!signal?.aborted)
        store.handleError(
          error,
          'Не удалось получить итог. Попробуйте ещё раз.',
        );
      return 'error';
    } finally {
      store.update({ resultLoading: false });
    }
  };

  const finish = async (): Promise<boolean> => {
    if (store.getSnapshot().busy || store.getSnapshot().consentBlocked)
      return false;
    if (!store.canSave()) return (await refreshResult()) === 'completed';
    store.update({ busy: true, error: '' });
    try {
      if (!(await queue.flushAll())) {
        if (!store.getSnapshot().closed && !store.getSnapshot().consentBlocked)
          store.update({
            error:
              'Не все ответы сохранены. Повторите отправку перед завершением.',
          });
        return false;
      }
      const next = await submitAssessment(store.getSnapshot().attempt.id);
      store.apply(next);
      return !!next.result;
    } catch (error) {
      store.handleError(
        error,
        'Не удалось завершить тест. Попробуйте ещё раз.',
      );
      return false;
    } finally {
      store.update({ busy: false });
    }
  };

  return { refreshResult, finish };
};
