import { ApiError, getApiErrorMessage } from '@/shared/api';

export const getResumeImportError = (error: unknown): string => {
  if (error instanceof ApiError) {
    const messages: Record<string, string> = {
      consent_required:
        'Для импорта нужно активное согласие на обработку данных.',
      resume_too_large: 'Размер PDF должен быть не больше 5 МиБ.',
      resume_unrecognized:
        'Не удалось распознать резюме. Загрузите PDF с текстовым слоем, скачанный с hh.ru, до 10 страниц.',
      import_busy:
        'Сервис занят разбором других резюме. Файл выбран — повторите попытку позже.',
      candidate_unavailable:
        'Сервис кандидатов временно недоступен. Попробуйте позже.',
      limit_reached:
        'Достигнут лимит записей. Удалите ненужную запись и повторите сохранение.',
      profile_not_found:
        'Сначала создайте профиль. Импортированный черновик сохранён на этой странице.',
    };
    if (messages[error.code]) return messages[error.code];
  }
  return getApiErrorMessage(error);
};

export const getImportRetryAt = (retryAfter?: string, now = Date.now()) => {
  if (retryAfter && /^\d+$/.test(retryAfter.trim()))
    return now + Number(retryAfter) * 1000;
  const date = retryAfter ? Date.parse(retryAfter) : NaN;
  return Number.isFinite(date) ? Math.max(now, date) : now + 5000;
};
