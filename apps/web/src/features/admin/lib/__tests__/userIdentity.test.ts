import { expect, it } from 'vitest';

import { adminUserLabel } from '../userIdentity';

const base = {
  role: 'employer' as const,
  full_name: null,
  email: null,
  contact_email: null,
};
it('identifies accounts by their best available admin identity without inventing names', () => {
  expect(
    adminUserLabel({
      ...base,
      full_name: '  Иван Петров  ',
      email: 'account@example.test',
    }),
  ).toBe('Иван Петров');
  expect(
    adminUserLabel({
      ...base,
      full_name: ' ',
      email: 'account@example.test',
      contact_email: 'contacts@example.test',
    }),
  ).toBe('account@example.test');
  expect(
    adminUserLabel({ ...base, contact_email: 'contacts@example.test' }),
  ).toBe('contacts@example.test');
  expect(adminUserLabel(base)).toBe('Работодатель');
});
