import type { PreviewAnswer, PreviewQuestion } from '@/entities/admin';

export const getPreviewAnswerIssue = (
  question: PreviewQuestion,
  answer: PreviewAnswer,
): string | null => {
  if (question.answer_form.type === 'text') {
    if (!answer.text?.trim())
      return 'Введите ответ. Сохранённый ответ нельзя очистить, но можно заменить.';
    if (Array.from(answer.text).length > 500) return 'Максимум 500 символов';
    return answer.text.includes('\0') ? 'Недопустимый символ' : null;
  }
  const selected = answer.selected ?? [];
  if (!selected.length)
    return 'Выберите ответ. Сохранённый ответ нельзя очистить, но можно заменить.';
  if (!question.answer_form.multiple && selected.length !== 1)
    return 'Выберите один ответ';
  if (
    new Set(selected).size !== selected.length ||
    selected.some((id) => !question.prompt.options?.some((o) => o.id === id))
  )
    return 'Недопустимый вариант ответа';
  return null;
};
export const equalPreviewAnswers = (
  a: PreviewAnswer | null,
  b: PreviewAnswer | null,
) => {
  if (a?.text !== b?.text) return false;
  return (
    [...(a?.selected ?? [])].sort().join('\0') ===
    [...(b?.selected ?? [])].sort().join('\0')
  );
};
export const previewSecondsRemaining = (
  expiresAt: string,
  serverTime: string,
  elapsedMs: number,
) =>
  Math.max(
    0,
    Math.ceil(
      (Date.parse(expiresAt) - Date.parse(serverTime) - elapsedMs) / 1000,
    ),
  );
