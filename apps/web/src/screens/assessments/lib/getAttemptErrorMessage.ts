import { ApiError } from '@/shared/api';

export const getAttemptErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError && error.code === 'attempt_not_found') {
    return 'Попытка не найдена.';
  }

  return 'Не удалось загрузить попытку. Попробуйте ещё раз.';
};
