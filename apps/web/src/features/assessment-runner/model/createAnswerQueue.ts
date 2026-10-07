import type { AssessmentAnswer } from '@/entities/assessment';

export type AnswerState = {
  answer: AssessmentAnswer;
  saved: AssessmentAnswer | null;
  revision: number;
  saving: boolean;
  error: string;
};

type QueueOptions = {
  save: (id: string, answer: AssessmentAnswer) => Promise<void | boolean>;
  onChange: () => void;
};

export const createAnswerQueue = ({ save, onChange }: QueueOptions) => {
  const entries = new Map<string, AnswerState>();
  const requests = new Map<string, Promise<boolean>>();
  const equal = (a: AssessmentAnswer | null, b: AssessmentAnswer) =>
    JSON.stringify(a) === JSON.stringify(b);

  const initialize = (id: string, answer: AssessmentAnswer) =>
    entries.set(id, {
      answer,
      saved: answer,
      revision: 0,
      saving: false,
      error: '',
    });

  const update = (id: string, answer: AssessmentAnswer) => {
    const entry = entries.get(id);
    if (!entry) return;
    entry.answer = answer;
    entry.revision += 1;
    entry.error = '';
    onChange();
  };

  const flush = (id: string): Promise<boolean> => {
    const existing = requests.get(id);
    if (existing) return existing;

    const entry = entries.get(id);
    if (!entry || equal(entry.saved, entry.answer)) {
      return Promise.resolve(true);
    }

    const run = async () => {
      entry.saving = true;
      entry.error = '';
      onChange();

      try {
        while (!equal(entry.saved, entry.answer)) {
          const answer = entry.answer;
          if ((await save(id, answer)) === false) {
            entry.error = 'Ответ не сохранён. Повторите отправку.';
            return false;
          }
          entry.saved = answer;
        }
        return true;
      } catch {
        entry.error = 'Ответ не сохранён. Повторите отправку.';
        return false;
      } finally {
        entry.saving = false;
        requests.delete(id);
        onChange();
      }
    };

    const request = run();
    requests.set(id, request);

    return request;
  };

  return {
    initialize,
    update,
    flush,
    get: (id: string) => entries.get(id),
    dirty: () =>
      [...entries.values()].some((entry) => !equal(entry.saved, entry.answer)),
    flushAll: async () =>
      (await Promise.all([...entries.keys()].map(flush))).every(Boolean),
  };
};
