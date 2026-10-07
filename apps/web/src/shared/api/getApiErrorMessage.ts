import { ApiError } from './errors';

export const getApiErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Сессия истекла. Войдите снова.';
    if (error.status === 403)
      return 'Недостаточно прав для этого действия. Обновите страницу.';
    if (error.status === 404) return 'Данные недоступны или удалены.';
    if (error.status === 503)
      return 'Сервис временно недоступен. Попробуйте ещё раз.';
    if (error.status >= 500)
      return 'Не удалось выполнить действие на сервере. Попробуйте ещё раз.';
    if (!error.status)
      return 'Не удалось связаться с сервером. Проверьте соединение.';
  }
  return error instanceof Error
    ? error.message
    : 'Не удалось выполнить действие. Попробуйте ещё раз.';
};
