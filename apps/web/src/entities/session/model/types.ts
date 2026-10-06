export const USER_ROLES = {
  CANDIDATE: 'candidate',
  EMPLOYER: 'employer',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
export type RegistrationRole = Exclude<UserRole, typeof USER_ROLES.ADMIN>;

export type SessionUser = {
  id: string;
  sub: string;
  email: string;
  name?: string;
  emailVerified: boolean;
  role?: UserRole;
  status: 'active' | 'blocked' | 'deleted';
};
