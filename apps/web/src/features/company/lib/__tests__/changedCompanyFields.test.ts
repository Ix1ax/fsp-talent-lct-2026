import { describe, expect, it } from 'vitest';

import { changedCompanyFields } from '../changedCompanyFields';
describe('Частичное сохранение компании', () => {
  it('не перезаписывает остальные поля и сохраняет явное очищение', () => {
    const current = {
      name: 'Компания',
      contactEmail: 'team@example.org',
      description: 'Описание',
      inn: null,
      contactUrl: null,
    };
    expect(
      changedCompanyFields(current, { ...current, description: null }),
    ).toEqual({ description: null });
    expect(
      changedCompanyFields(current, {
        name: current.name,
        contactEmail: current.contactEmail,
      }),
    ).toEqual({});
  });
});
