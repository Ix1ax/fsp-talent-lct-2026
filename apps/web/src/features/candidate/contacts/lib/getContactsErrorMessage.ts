import { ApiError } from '@/shared/api/errors';

export const getContactsErrorMessage = (error: unknown): string => {
  if (!(error instanceof ApiError))
    return 'Не удалось сохранить контакты. Попробуйте ещё раз.';
  if (error.code === 'consent_required')
    return 'Для сохранения контактов нужно согласие на обработку персональных данных. Проверьте согласия и повторите сохранение.';
  if (error.status === 400) return error.message;
  if (error.status === 401) return 'Сессия истекла. Войдите в аккаунт снова.';
  if (error.status === 403)
    return 'Сохранение контактов недоступно для вашего аккаунта.';
  if (error.status === 413) return 'Размер запроса превышает допустимый.';
  if (error.status === 503)
    return 'Сервис контактов временно недоступен. Попробуйте ещё раз.';
  return 'Не удалось сохранить контакты. Попробуйте ещё раз.';
};
