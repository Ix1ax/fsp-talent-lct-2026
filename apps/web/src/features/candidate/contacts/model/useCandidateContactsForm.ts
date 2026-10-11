import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { ensureClientAccessToken } from '@/shared/api';
import { ApiError } from '@/shared/api/errors';
import { toast } from '@/shared/ui';
import {
  type CandidateContacts,
  saveCandidateContacts,
} from '@/entities/candidate';

import {
  areContactsEqual,
  getContactsErrorMessage,
  toContactsFormValues,
  toContactsInput,
} from '../lib';
import { contactsSchema } from './contactsSchema';
import type { ContactsFormValues } from './types';

type UseCandidateContactsFormOptions = {
  contacts: CandidateContacts | null;
  defaultName?: string;
  defaultEmail: string;
  processing: boolean;
  onBusyChange: (busy: boolean) => void;
  onContactsChange: (contacts: CandidateContacts) => void;
  onConsentRequired: () => Promise<void>;
};

export const useCandidateContactsForm = ({
  contacts,
  defaultName,
  defaultEmail,
  processing,
  onBusyChange,
  onContactsChange,
  onConsentRequired,
}: UseCandidateContactsFormOptions) => {
  const defaults = useMemo(
    () =>
      toContactsFormValues(contacts, {
        name: defaultName,
        email: defaultEmail,
      }),
    [contacts, defaultName, defaultEmail],
  );
  const form = useForm<ContactsFormValues>({
    resolver: zodResolver(contactsSchema),
    defaultValues: defaults,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
  const values = useWatch({ control: form.control }) as ContactsFormValues;
  const { dirtyFields } = form.formState;
  const { reset } = form;
  const previousDefaults = useRef(defaults);
  const saving = useRef(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (areContactsEqual(previousDefaults.current, defaults)) return;
    previousDefaults.current = defaults;
    reset(defaults, { keepDirtyValues: true });
  }, [defaults, reset]);

  const dirty =
    !contacts ||
    (Object.keys(dirtyFields).length > 0 &&
      !areContactsEqual(values, defaults));

  const save = async (values: ContactsFormValues) => {
    if (saving.current || !processing || !dirty) return false;

    saving.current = true;
    setMessage('');
    onBusyChange(true);

    try {
      await ensureClientAccessToken();
      const next = await saveCandidateContacts(toContactsInput(values));
      onContactsChange(next);

      const savedDefaults = toContactsFormValues(next, {
        name: defaultName,
        email: defaultEmail,
      });

      previousDefaults.current = savedDefaults;
      reset(savedDefaults);
      toast.success('Контакты сохранены.', { id: 'candidate-contacts' });
      return true;
    } catch (error) {
      const text = getContactsErrorMessage(error);
      setMessage(text);
      toast.error(text, { id: 'candidate-contacts' });

      if (error instanceof ApiError && error.code === 'consent_required') {
        try {
          await onConsentRequired();
        } catch {
          setMessage(
            'Не удалось обновить согласия. Ваш ввод сохранён. Попробуйте ещё раз.',
          );
        }
      }
      return false;
    } finally {
      saving.current = false;
      onBusyChange(false);
    }
  };

  return { form, message, dirty, save };
};
