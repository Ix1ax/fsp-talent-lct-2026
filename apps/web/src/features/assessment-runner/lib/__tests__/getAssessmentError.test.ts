import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/errors';

import { getAssessmentError } from '../getAssessmentError';

describe('assessment errors', () => {
  it('explains revoked consent and closed attempts', () => {
    expect(
      getAssessmentError(new ApiError(409, '', 'consent_required'), 'fallback'),
    ).toContain('Согласие');
    expect(
      getAssessmentError(new ApiError(409, '', 'attempt_closed'), 'fallback'),
    ).toContain('Попытка закрыта');
  });
  it('preserves a fallback for network errors', () => {
    expect(getAssessmentError(new Error('offline'), 'Повторить')).toBe(
      'Повторить',
    );
  });
  it('explains server retake restrictions', () => {
    expect(
      getAssessmentError(
        new ApiError(409, '', 'retake_cooldown', {
          error: { retryAt: '2026-10-14T12:00:00Z' },
        }),
        '',
      ),
    ).toContain('Пересдача доступна');
    expect(
      getAssessmentError(new ApiError(409, '', 'already_confirmed'), ''),
    ).toContain('уже подтверждён');
  });
});
