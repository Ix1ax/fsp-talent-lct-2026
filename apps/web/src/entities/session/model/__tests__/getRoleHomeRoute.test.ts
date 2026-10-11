import { describe, expect, it } from 'vitest';

import { getRoleHomeRoute } from '../getRoleHomeRoute';
import { USER_ROLES } from '../types';

describe('getRoleHomeRoute', () => {
  it('maps each supported role without redirecting admin to employer', () => {
    expect(getRoleHomeRoute(USER_ROLES.CANDIDATE)).toBe('/candidate');
    expect(getRoleHomeRoute(USER_ROLES.EMPLOYER)).toBe('/employer');
    expect(getRoleHomeRoute(USER_ROLES.ADMIN)).toBe('/');
  });
});
