import {
  type CandidateConsents,
  getConsentPermissions,
} from '@/entities/candidate-consent';
import type { SearchStatus } from '@/entities/candidate-profile';

export const getProfileConsentError = (
  consents: CandidateConsents,
  hasProfile: boolean,
  searchStatus: SearchStatus,
): string => {
  const permissions = getConsentPermissions(consents);
  if (!hasProfile && !permissions.processing)
    return 'Для создания профиля дайте согласие на обработку персональных данных.';
  if (searchStatus !== 'hidden' && !permissions.canPublish)
    return 'Для публикации профиля нужны согласия на обработку персональных данных и публикацию.';
  return '';
};
