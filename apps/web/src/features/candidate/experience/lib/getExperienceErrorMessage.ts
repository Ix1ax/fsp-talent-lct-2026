import { getApiErrorMessage } from '@/shared/api';
import { ApiError } from '@/shared/api/errors';

export const getExperienceErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'limit_reached':
        return 'Можно добавить не больше 30 мест работы. Удалите одну из записей или измените существующую.';
      case 'experience_not_found':
        return 'Место работы уже удалено или недоступно. Обновите список. Ваш ввод сохранён.';
      case 'profile_not_found':
        return 'Профиль не найден. Создайте профиль, чтобы сохранить опыт работы. Ваш ввод сохранён.';
      case 'validation_error':
        return 'Не удалось сохранить запись. Проверьте поля: компания, должность и даты должны соответствовать требованиям сервера. Ваш ввод сохранён.';
      case 'request_too_large':
        return 'Запись слишком большая. Сократите описание и попробуйте снова.';
    }
  }
  return getApiErrorMessage(error);
};
