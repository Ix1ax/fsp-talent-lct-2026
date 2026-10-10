import { ApiError } from './errors';

export const getApiErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.code === 'user_inactive')
      return 'Учётная запись заблокирована или удалена.';
    if (error.code === 'invitation_invalid')
      return 'Приглашение недействительно, отозвано или срок его действия истёк.';
    if (error.code === 'upload_busy')
      return `Загрузка уже выполняется. Повторите через ${error.retryAfter ?? '2'} сек.`;
    if (error.status >= 500 && error.headers['x-request-id'])
      return `Не удалось выполнить действие на сервере. Попробуйте ещё раз. Код запроса: ${error.headers['x-request-id']}`;
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
