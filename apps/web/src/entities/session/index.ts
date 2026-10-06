// Server-only APIs: import from '@/entities/session/api/server'

export { getMeClient, registerRole } from './api';
export type { SessionUser, UserRole } from './model';
export { getRoleHomeRoute, USER_ROLES } from './model';
