import { describe, expect, it } from 'vitest';

import { ApiError } from '../errors';
import { getApiErrorMessage } from '../getApiErrorMessage';

describe('cooldown messages', () => {
  it('shows the server retry delay', () => {
    expect(
      getApiErrorMessage(
        new ApiError(429, '', 'unknown', undefined, {
          'Retry-After': '60',
        }),
      ),
    ).toBe('Повторите запрос через 60 сек.');
  });

  it('shows the retry date for a cooldown response', () => {
    expect(
      getApiErrorMessage(
        new ApiError(409, '', 'sync_cooldown', {
          error: { retryAt: '2026-10-14T12:00:00Z' },
        }),
      ),
    ).toContain('Повторный запрос доступен');
  });

  it('does not show an invalid retry date or delay', () => {
    expect(
      getApiErrorMessage(
        new ApiError(
          429,
          '',
          'unknown',
          {
            error: { retryAt: 'invalid' },
          },
          { 'Retry-After': 'invalid' },
        ),
      ),
    ).toBe(
      'Повторный запрос временно недоступен. Подождите и попробуйте ещё раз.',
    );
  });
  it('translates browser timeout and network errors', () => {
    expect(
      getApiErrorMessage(new DOMException('signal timed out', 'TimeoutError')),
    ).toBe(
      'Сервер не ответил вовремя. Проверьте подключение и попробуйте ещё раз.',
    );
    expect(getApiErrorMessage(new TypeError('Failed to fetch'))).toBe(
      'Не удалось связаться с сервером. Проверьте соединение.',
    );
  });
});
