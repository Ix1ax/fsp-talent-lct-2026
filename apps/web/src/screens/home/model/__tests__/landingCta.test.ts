import { describe, expect, it } from 'vitest';

import { getLandingCta } from '../landingCta';

const user = (role: 'candidate' | 'employer') =>
  ({
    kind: 'user',
    user: { id: '1', role, email: 'a@b.c', status: 'active' },
  }) as never;

describe('getLandingCta', () => {
  it('invites a guest to create a profile', () => {
    expect(getLandingCta(null).label).toBe('Создать профиль');
    expect(getLandingCta({ kind: 'guest' }).label).toBe('Создать профиль');
    expect(getLandingCta({ kind: 'guest' }).forGuest).toBe(true);
    expect(getLandingCta(null).forGuest).toBe(false);
  });

  it('sends a signed-in user to their cabinet', () => {
    expect(getLandingCta(user('candidate'))).toEqual({
      label: 'Мой кабинет',
      href: '/candidate',
      forGuest: false,
    });
    expect(getLandingCta(user('employer')).label).toBe('Кабинет работодателя');
    expect(getLandingCta(user('employer')).forGuest).toBe(false);
  });
});
