import { formatDate } from '../utils';
import { ApiError } from './errors';

export const getApiErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.status === 429 || error.code.endsWith('_cooldown')) {
      if (error.retryAt && Number.isFinite(Date.parse(error.retryAt)))
        return `Повторный запрос доступен ${formatDate(error.retryAt)}.`;
      if (error.retryAfter && /^\d+$/.test(error.retryAfter))
        return `Повторите запрос через ${error.retryAfter} сек.`;
      return 'Повторный запрос временно недоступен. Подождите и попробуйте ещё раз.';
    }
    if (error.code === 'company_blocked')
      return 'Компания заблокирована. Обратитесь к администратору для восстановления доступа.';
    if (error.code === 'verification_evidence_required')
      return 'Укажите ИНН в профиле компании и загрузите хотя бы один готовый документ компании. Логотип не учитывается.';
    if (error.code === 'user_inactive')
      return 'Учётная запись заблокирована или удалена.';
    if (error.code === 'invitation_invalid')
      return 'Приглашение недействительно, отозвано или срок его действия истёк.';
    if (error.code === 'upload_busy')
      return `Загрузка уже выполняется. Повторите через ${error.retryAfter ?? '2'} сек.`;
    if (error.status >= 500 && error.headers['x-request-id'])
      return `На сервере произошла ошибка. Попробуйте ещё раз. Код запроса: ${error.headers['x-request-id']}`;
    if (error.status === 401) return 'Сессия истекла. Войдите снова.';
    if (error.status === 403)
      return 'Недостаточно прав для этого действия. Обновите страницу.';
    if (error.status === 404) return 'Данные недоступны или удалены.';
    if (error.status === 503)
      return 'Сервис временно недоступен. Попробуйте ещё раз.';
    if (error.status >= 500)
      return 'На сервере произошла ошибка. Попробуйте ещё раз.';
    if (!error.status)
      return 'Не удалось связаться с сервером. Проверьте соединение.';
  }
  // Ошибки браузера приходят на английском («signal timed out», «Failed to
  // fetch») — пользователю показываем русский текст.
  if (error instanceof Error && error.name === 'TimeoutError')
    return 'Сервер не ответил вовремя. Проверьте подключение и попробуйте ещё раз.';
  if (
    error instanceof TypeError &&
    /fetch|network|load failed/i.test(error.message)
  )
    return 'Не удалось связаться с сервером. Проверьте соединение.';
  return error instanceof Error
    ? error.message
    : 'Не удалось выполнить действие. Попробуйте ещё раз.';
};
