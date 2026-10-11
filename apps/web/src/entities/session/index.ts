// Server-only APIs: import from '@/entities/session/api/server'

export { getMeClient, registerRole } from './api';
export type {
  RegistrationRole,
  SessionState,
  SessionUser,
  UserRole,
} from './model';
export {
  getRoleHomeRoute,
  readLastKnownRole,
  rememberRole,
  USER_ROLES,
} from './model';
export { useClientSession } from './model/useClientSession';
export { useLastKnownRole } from './model/useLastKnownRole';
export { RememberRole } from './ui/RememberRole';
