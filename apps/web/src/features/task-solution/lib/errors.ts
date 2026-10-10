import { ApiError } from '@/shared/api';

export const taskErrorMessage = (error: unknown): string => {
  if (!(error instanceof ApiError))
    return 'Не удалось загрузить данные. Повторите попытку.';

  const messages: Record<string, string> = {
    already_submitted:
      'Решение уже отправлено. Откройте «Мои решения», чтобы посмотреть его.',
    task_closed: 'Приём решений завершён. Отправить файл больше нельзя.',
    consent_required:
      'Для отправки нужны согласия на обработку данных и публикацию профиля.',
    file_too_large: 'Файл должен быть не больше 10 МиБ.',
    unsupported_file_type: 'Допустимы PDF, JPEG, PNG, ZIP, TXT и Markdown.',
    invalid_file:
      'Файл пустой, повреждён или не соответствует ограничениям. Выберите другой файл.',
    upload_busy: `Загрузка временно занята. Повторите через ${error.retryAfter || '2'} сек.`,
    daily_tasks_unavailable: 'Задания временно недоступны. Попробуйте позже.',
    storage_unavailable:
      'Хранилище файлов временно недоступно. Попробуйте позже.',
    unauthorized: 'Сессия истекла. Войдите в аккаунт снова.',
    not_found: 'Задание или решение больше недоступно.',
    network:
      'Не удалось связаться с сервером. Проверьте соединение. Если отправляли файл, проверьте «Мои решения» перед повтором.',
    timeout:
      'Сервер не подтвердил отправку. Проверьте «Мои решения» перед повтором.',
  };

  return (
    messages[error.code] || error.message || 'Не удалось выполнить запрос.'
  );
};
