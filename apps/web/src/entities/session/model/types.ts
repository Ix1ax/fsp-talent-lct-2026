export const USER_ROLES = {
  CANDIDATE: 'candidate',
  EMPLOYER: 'employer',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export type SessionUser = {
  sub: string;
  email: string;
  emailVerified: boolean;
  role?: UserRole;
};
