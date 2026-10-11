import { ApiError } from '@/shared/api/errors';

export const getAvatarError = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.status === 413)
      return 'Размер изображения не должен превышать 2 МБ.';
    if (error.status === 415) return 'Выберите изображение JPEG или PNG.';
    if (error.status === 400) return error.message;
    if (error.status === 401) return 'Сессия истекла. Войдите в аккаунт снова.';
    if (error.status === 403) return 'Действие недоступно для вашего аккаунта.';
    if (error.code === 'profile_not_found')
      return 'Профиль не найден. Обновите страницу.';
  }
  return 'Не удалось загрузить изображение. Попробуйте ещё раз.';
};
