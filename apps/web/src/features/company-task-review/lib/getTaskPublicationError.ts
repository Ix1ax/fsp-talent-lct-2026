import { ApiError, getApiErrorMessage } from '@/shared/api';

const MESSAGES: Record<string, string> = {
  daily_task_limit:
    'Сегодня компания уже опубликовала задание. Следующая публикация доступна после полуночи по Москве. Закрытие задания не освобождает квоту.',
  invalid_file:
    'Файл пустой, повреждён или не соответствует ограничениям. Выберите другой файл.',
  unsupported_file_type:
    'Допустимы PDF, JPEG, PNG, ZIP, TXT и Markdown. Тип файла проверяется по содержимому.',
  file_too_large: 'Файл должен быть не больше 10 МиБ.',
  network:
    'Сервер не подтвердил публикацию. Перед повтором проверьте список заданий компании.',
  timeout:
    'Сервер не подтвердил публикацию. Перед повтором проверьте список заданий компании.',
};

export const getTaskPublicationError = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.code === 'upload_busy') {
      return `Загрузка временно занята. Повторите через ${error.retryAfter || 2} сек.`;
    }
    if (Object.hasOwn(MESSAGES, error.code)) return MESSAGES[error.code];
  }
  return getApiErrorMessage(error);
};
