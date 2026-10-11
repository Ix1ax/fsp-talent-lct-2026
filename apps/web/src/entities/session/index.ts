// Server-only APIs: import from '@/entities/session/api/server'

export { getMeClient, registerRole } from './api';
export type {
  RegistrationRole,
  SessionState,
  SessionUser,
  UserRole,
} from './model';
export { getRoleHomeRoute, USER_ROLES } from './model';
export { useClientSession } from './model/useClientSession';
