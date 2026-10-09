import { z } from 'zod';

import { adminRequest } from './adminRequest';
import { accountSchema, loginSchema } from './schemas';

const ADMIN_LOGOUT_TIMEOUT_MS = 5_000;
export const adminLogin = (email: string, password: string) =>
  adminRequest(null, '/auth/login', loginSchema, {
    method: 'POST',
    body: { email: email.trim().toLowerCase(), password },
  });
export const adminMe = (token: string, signal?: AbortSignal) =>
  adminRequest(token, '/auth/me', accountSchema, { signal });
export const adminLogout = (token: string) =>
  adminRequest(token, '/auth/logout', z.undefined(), {
    method: 'POST',
    timeoutMs: ADMIN_LOGOUT_TIMEOUT_MS,
  });
