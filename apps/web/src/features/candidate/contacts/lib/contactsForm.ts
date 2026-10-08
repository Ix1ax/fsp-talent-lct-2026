import type {
  CandidateContacts,
  SaveCandidateContactsInput,
} from '@/entities/candidate';

import type { ContactsFormValues } from '../model';

type ContactDefaults = { name?: string; email: string };

export const toContactsFormValues = (
  contacts: CandidateContacts | null,
  defaults: ContactDefaults,
): ContactsFormValues => {
  if (contacts)
    return {
      fullName: contacts.fullName ?? '',
      email: contacts.email ?? '',
      phone: contacts.phone ?? '',
      telegram: contacts.telegram ?? '',
    };
  return {
    fullName: defaults.name ?? '',
    email: defaults.email,
    phone: '',
    telegram: '',
  };
};

export const toContactsInput = (
  values: ContactsFormValues,
): SaveCandidateContactsInput => ({
  fullName: values.fullName.trim(),
  email: values.email.trim(),
  phone: values.phone.trim(),
  telegram: values.telegram.trim(),
});

export const areContactsEqual = (
  left: ContactsFormValues,
  right: ContactsFormValues,
): boolean => {
  const a = toContactsInput(left);
  const b = toContactsInput(right);
  return (
    a.fullName === b.fullName &&
    a.email === b.email &&
    a.phone === b.phone &&
    a.telegram === b.telegram
  );
};
