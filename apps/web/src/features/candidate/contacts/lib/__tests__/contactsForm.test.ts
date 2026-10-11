import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/errors';

import { contactsSchema } from '../../model';
import {
  areContactsEqual,
  getContactsErrorMessage,
  toContactsFormValues,
  toContactsInput,
} from '../index';

const contacts = {
  fullName: 'Иван',
  email: 'private@example.com',
  phone: '+7 999 111-22-33',
  telegram: '@ivan',
  updatedAt: 'now',
};
const defaults = { name: 'Keycloak Name', email: 'auth@example.com' };

describe('private contacts form', () => {
  it('normalizes nullable API fields before comparison and saving', () => {
    const values = toContactsFormValues(
      {
        ...contacts,
        fullName: null,
        email: null,
        phone: null,
        telegram: null,
      },
      defaults,
    );
    const empty = { fullName: '', email: '', phone: '', telegram: '' };
    expect(values).toEqual(empty);
    expect(areContactsEqual(values, empty)).toBe(true);
    expect(toContactsInput(values)).toEqual(empty);
    expect(contactsSchema.safeParse(values).success).toBe(true);
  });
  it('prefills identity only when contacts are not saved yet', () => {
    expect(toContactsFormValues(null, defaults)).toEqual({
      fullName: defaults.name,
      email: defaults.email,
      phone: '',
      telegram: '',
    });
    expect(toContactsFormValues(contacts, defaults)).toEqual({
      fullName: contacts.fullName,
      email: contacts.email,
      phone: contacts.phone,
      telegram: contacts.telegram,
    });
  });
  it('preserves intentionally empty saved values instead of replacing them with account data', () => {
    expect(
      toContactsFormValues({ ...contacts, fullName: '', email: '' }, defaults),
    ).toMatchObject({ fullName: '', email: '' });
  });
  it('sends the entire replacement object including cleared values', () => {
    expect(
      toContactsInput({
        ...contacts,
        fullName: ' Иван ',
        phone: '',
        telegram: '',
      }),
    ).toEqual({
      fullName: 'Иван',
      email: contacts.email,
      phone: '',
      telegram: '',
    });
  });
  it('ignores whitespace-only changes when comparing form data', () => {
    expect(
      areContactsEqual(contacts, { ...contacts, fullName: ' Иван ' }),
    ).toBe(true);
    expect(areContactsEqual(contacts, { ...contacts, phone: '' })).toBe(false);
  });
  it('validates email without imposing undocumented phone and Telegram formats', () => {
    expect(contactsSchema.safeParse(contacts).success).toBe(true);
    expect(
      contactsSchema.safeParse({ ...contacts, email: 'invalid' }).success,
    ).toBe(false);
    expect(contactsSchema.safeParse({ ...contacts, email: '' }).success).toBe(
      true,
    );
  });
  it('rejects control characters in contact fields', () => {
    expect(
      contactsSchema.safeParse({ ...contacts, fullName: 'Иван\0Петров' })
        .success,
    ).toBe(false);
  });
  it('explains missing consent and preserves server validation details', () => {
    expect(
      getContactsErrorMessage(
        new ApiError(409, 'required', 'consent_required'),
      ),
    ).toContain('согласие');
    expect(
      getContactsErrorMessage(
        new ApiError(400, 'Некорректный телефон', 'validation_error'),
      ),
    ).toBe('Некорректный телефон');
  });
});
