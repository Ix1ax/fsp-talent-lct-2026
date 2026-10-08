import { ApiError } from '@/shared/api/errors';

export const getProfileErrorMessage = (error: unknown): string => {
  if (!(error instanceof ApiError))
    return 'Не удалось выполнить действие. Попробуйте ещё раз.';
  if (error.code === 'consent_required')
    return 'Дайте необходимые согласия в блоке «Согласия» и сохраните профиль снова. Ваш ввод сохранён.';
  switch (error.status) {
    case 401:
      return 'Сессия истекла. Войдите в аккаунт снова.';
    case 403:
      return 'Действие недоступно для вашего аккаунта.';
    case 413:
      return 'Размер запроса не должен превышать 2 МиБ.';
    case 415:
      return 'Выберите изображение JPEG или PNG.';
    case 400:
      return error.message;
    case 503:
      return 'Сервис временно недоступен. Попробуйте ещё раз.';
    default:
      return 'Не удалось выполнить действие. Попробуйте ещё раз.';
  }
};
