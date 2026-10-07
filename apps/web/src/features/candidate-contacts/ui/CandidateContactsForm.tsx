import { Button, toast } from '@/shared/ui';
import type { CandidateContacts } from '@/entities/candidate-contacts';

import { useCandidateContactsForm } from '../model';
import { ContactsTextFields } from './ContactsTextFields';

interface CandidateContactsFormProps {
  contacts: CandidateContacts | null;
  defaultName?: string;
  defaultEmail: string;
  processing: boolean;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onContactsChange: (contacts: CandidateContacts) => void;
  onConsentRequired: () => Promise<void>;
}

export const CandidateContactsForm = (props: CandidateContactsFormProps) => {
  const { form, message, dirty, save } = useCandidateContactsForm(props);
  useUnsavedChanges(form.formState.isDirty);
  return (
    <form
      noValidate
      aria-busy={props.busy}
      onSubmit={form.handleSubmit(
        async (values) => {
          if (!props.busy) await save(values);
        },
        () => toast.error('Проверьте контактные данные перед сохранением.'),
      )}
    >
      <fieldset
        disabled={props.busy || !props.processing}
        className="flex min-w-0 flex-col gap-4"
      >
        <ContactsTextFields
          register={form.register}
          errors={form.formState.errors}
        />
        {message && (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}
        <Button
          type="submit"
          className="self-start"
          disabled={props.busy || !props.processing || !dirty}
        >
          Сохранить контакты
        </Button>
      </fieldset>
    </form>
  );
};
import { useUnsavedChanges } from '@/shared/hooks';
