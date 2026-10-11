import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/errors';

import { getEducationErrorMessage } from '../getEducationErrorMessage';

describe('education error recovery', () => {
  it.each([
    [409, 'limit_reached', '10 записей'],
    [404, 'profile_not_found', 'Создайте профиль'],
    [404, 'education_not_found', 'Обновите список'],
    [400, 'validation_error', 'Ваш ввод сохранён'],
    [413, 'request_too_large', 'Сократите'],
    [503, 'candidate_unavailable', 'временно недоступен'],
  ])('explains %s %s', (status, code, text) => {
    expect(
      getEducationErrorMessage(new ApiError(status, 'Backend message', code)),
    ).toContain(text);
  });
});
