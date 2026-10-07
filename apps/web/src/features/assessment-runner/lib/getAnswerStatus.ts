import type { AnswerState } from '../model';

export const getAnswerStatus = (state: AnswerState): string => {
  if (state.saving) return 'Сохраняется…';
  if (state.error) return state.error;

  if (JSON.stringify(state.answer) !== JSON.stringify(state.saved)) {
    return 'Есть несохранённые изменения';
  }

  if (!state.saved?.selected?.length && !state.saved?.text?.trim()) {
    return 'Ответ не указан';
  }

  return 'Сохранено';
};
