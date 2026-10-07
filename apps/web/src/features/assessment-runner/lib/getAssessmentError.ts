import { ApiError } from '@/shared/api';
import { formatDate } from '@/shared/utils';

export const getAssessmentError = (
  error: unknown,
  fallback: string,
): string => {
  if (!(error instanceof ApiError)) return fallback;

  if (error.code === 'consent_required')
    return 'Согласие на обработку данных отозвано. Дайте согласие в кабинете и вернитесь к тесту.';
  if (error.code === 'attempt_closed')
    return 'Попытка закрыта. Получаем серверный итог.';
  if (error.code === 'attempt_not_found')
    return 'Попытка не найдена или недоступна.';
  if (error.code === 'retake_cooldown' && error.retryAt)
    return `Пересдача доступна ${formatDate(error.retryAt)}`;
  if (error.code === 'already_confirmed')
    return 'Этот уровень уже подтверждён.';

  return fallback;
};
