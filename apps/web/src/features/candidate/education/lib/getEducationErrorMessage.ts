import { getApiErrorMessage } from '@/shared/api';
import { ApiError } from '@/shared/api/errors';

export const getEducationErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'limit_reached':
        return 'Можно добавить не больше 10 записей об образовании. Удалите одну из записей или измените существующую.';
      case 'education_not_found':
        return 'Запись об образовании уже удалена или недоступна. Обновите список. Ваш ввод сохранён.';
      case 'profile_not_found':
        return 'Профиль не найден. Создайте профиль, чтобы сохранить образование. Ваш ввод сохранён.';
      case 'validation_error':
        return 'Не удалось сохранить запись. Проверьте уровень образования, учебное заведение и год окончания. Ваш ввод сохранён.';
      case 'request_too_large':
        return 'Запись слишком большая. Сократите название учебного заведения или специальности и попробуйте снова.';
    }
  }
  return getApiErrorMessage(error);
};
