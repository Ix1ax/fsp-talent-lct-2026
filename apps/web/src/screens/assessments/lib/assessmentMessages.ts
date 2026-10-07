import { ApiError } from '@/shared/api';
import { formatDate } from '@/shared/utils';
import type { AvailableAssessment } from '@/entities/assessment';
import type { Catalogs } from '@/entities/catalog';

export const getAssessmentReasonText = (test: AvailableAssessment) => {
  if (test.reason === 'retake_cooldown')
    return test.retryAt
      ? `Пересдача доступна ${formatDate(test.retryAt)}`
      : 'Пересдача пока недоступна.';

  if (test.reason === 'attempt_active')
    return 'Сначала завершите активную попытку.';

  if (test.reason === 'already_confirmed')
    return 'Этот уровень уже подтверждён.';

  if (test.reason === 'consent_required')
    return 'Нужно согласие на обработку персональных данных.';

  return test.canStart ? 'Можно пройти тест.' : 'Тест пока недоступен.';
};

export const getAssessmentTitle = (
  test: AvailableAssessment,
  catalogs?: Catalogs,
): string => {
  const specialization =
    catalogs?.specializations.find((item) => item.id === test.specializationId)
      ?.name ?? `Специализация №${test.specializationId}`;

  const grade =
    catalogs?.grades.find((item) => item.id === test.gradeId)?.name ??
    `Грейд №${test.gradeId}`;

  return `${specialization} · ${grade}`;
};

export const getAssessmentLoadError = (error: unknown): string => {
  if (error instanceof ApiError && error.code === 'profile_not_found')
    return 'Сначала создайте профиль кандидата.';

  return 'Не удалось загрузить тесты. Попробуйте ещё раз.';
};

export const getAssessmentStartError = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.code === 'attempt_active')
      return 'У вас уже есть активная попытка. Продолжите её.';

    if (error.code === 'retake_cooldown' && error.retryAt)
      return `Пересдача доступна ${formatDate(error.retryAt)}`;

    if (error.code === 'consent_required')
      return 'Дайте согласие на обработку персональных данных в профиле.';

    if (error.code === 'already_confirmed')
      return 'Этот уровень уже подтверждён. Обновите список тестов.';
  }

  return 'Не удалось начать тест. Обновите список и попробуйте ещё раз.';
};
