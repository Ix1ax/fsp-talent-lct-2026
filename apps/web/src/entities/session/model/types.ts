export type UserRole = 'candidate' | 'employer';

export type SessionUser = {
  sub: string;
  email: string;
  emailVerified: boolean;
  role?: UserRole;
};
