import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/errors';

import { getInvitationSubmitError } from '../getInvitationSubmitError';

describe('invitation submission failures', () => {
  it('attaches an invalid invitation to its token field', () => {
    expect(
      getInvitationSubmitError(
        new ApiError(400, 'Invalid', 'invitation_invalid'),
        false,
      ),
    ).toEqual({
      field: 'token',
      message:
        'Приглашение недействительно, отозвано или срок его действия истёк.',
    });
  });
  it.each([0, 403, 503])(
    'shows status %i as a form error without marking the token invalid',
    (status) => {
      const failure = getInvitationSubmitError(
        new ApiError(status, 'Failed'),
        false,
      );
      expect(failure?.field).toBe('root.server');
      expect(failure?.message).toBeTruthy();
    },
  );
  it('explains a failed refresh after acceptance without suggesting another mutation', () => {
    expect(getInvitationSubmitError(new ApiError(503, 'Failed'), true)).toEqual(
      {
        field: 'root.server',
        message:
          'Приглашение принято, но список компаний не обновился. Обновите страницу; повторно принимать приглашение не нужно.',
      },
    );
  });
  it('ignores expected cancellation and handles unknown failures', () => {
    expect(
      getInvitationSubmitError(
        new DOMException('Cancelled', 'AbortError'),
        false,
      ),
    ).toBeNull();
    expect(getInvitationSubmitError(undefined, false)).toEqual({
      field: 'root.server',
      message: 'Не удалось выполнить действие. Попробуйте ещё раз.',
    });
  });
});
