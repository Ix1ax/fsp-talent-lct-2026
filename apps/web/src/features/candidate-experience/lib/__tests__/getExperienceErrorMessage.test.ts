import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/errors';

import { getExperienceErrorMessage } from '../getExperienceErrorMessage';

describe('experience error recovery', () => {
  it.each([
    [409, 'limit_reached', '30 мест работы'],
    [404, 'profile_not_found', 'Создайте профиль'],
    [404, 'experience_not_found', 'Обновите список'],
    [400, 'validation_error', 'Ваш ввод сохранён'],
    [413, 'request_too_large', 'Сократите описание'],
    [503, 'candidate_unavailable', 'временно недоступен'],
    [401, 'unauthorized', 'Войдите снова'],
  ])('explains %s %s', (status, code, text) => {
    expect(
      getExperienceErrorMessage(new ApiError(status, 'Backend message', code)),
    ).toContain(text);
  });
});
