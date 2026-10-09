import { ApiError } from '@/shared/api/errors';
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';

type InvitationSubmitError = {
  field: 'token' | 'root.server';
  message: string;
};
export const getInvitationSubmitError = (
  error: unknown,
  accepted: boolean,
): InvitationSubmitError | null => {
  if (error instanceof Error && error.name === 'AbortError') return null;
  if (accepted)
    return {
      field: 'root.server',
      message:
        'Приглашение принято, но список компаний не обновился. Обновите страницу; повторно принимать приглашение не нужно.',
    };
  return {
    field:
      error instanceof ApiError && error.code === 'invitation_invalid'
        ? 'token'
        : 'root.server',
    message: getApiErrorMessage(error),
  };
};
