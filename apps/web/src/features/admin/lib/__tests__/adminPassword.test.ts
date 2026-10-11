import { describe, expect, it } from 'vitest';

import { getAdminPasswordIssue } from '../adminPassword';

describe('admin password length', () => {
  it('accepts the exact ASCII bounds', () => {
    expect(getAdminPasswordIssue('a'.repeat(12))).toBeNull();
    expect(getAdminPasswordIssue('a'.repeat(72))).toBeNull();
    expect(getAdminPasswordIssue('a'.repeat(11))).toBeTruthy();
    expect(getAdminPasswordIssue('a'.repeat(73))).toBeTruthy();
  });
  it('uses the backend UTF-8 limits for Cyrillic and emoji', () => {
    expect(getAdminPasswordIssue('я'.repeat(6))).toBeNull();
    expect(getAdminPasswordIssue('я'.repeat(36))).toBeNull();
    expect(getAdminPasswordIssue('я'.repeat(37))).toBeTruthy();
    expect(getAdminPasswordIssue('😀'.repeat(3))).toBeNull();
    expect(getAdminPasswordIssue('😀'.repeat(19))).toBeTruthy();
  });
});
