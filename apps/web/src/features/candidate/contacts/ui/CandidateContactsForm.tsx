import { CANDIDATE_DRAFT_ROUTES } from '@/shared/contants';
import {
  type FormDraftBridge,
  useFormDraftImport,
  useFormUnsavedChanges,
} from '@/shared/hooks';
import { Button, toast } from '@/shared/ui';
import type { CandidateContacts } from '@/entities/candidate';

import { toContactsInput } from '../lib';
import { type ContactsFormValues, useCandidateContactsForm } from '../model';
import { ContactsTextFields } from './ContactsTextFields';

interface CandidateContactsFormProps extends FormDraftBridge<ContactsFormValues> {
  contacts: CandidateContacts | null;
  defaultName?: string;
  defaultEmail: string;
  processing: boolean;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onContactsChange: (contacts: CandidateContacts) => void;
  onConsentRequired: () => Promise<void>;
  onSaved?: () => void;
}

export const CandidateContactsForm = (props: CandidateContactsFormProps) => {
  const { form, message, dirty, save } = useCandidateContactsForm(props);
  useFormDraftImport(form, props);
  const unsaved = useFormUnsavedChanges(form, {
    preserveWithin: CANDIDATE_DRAFT_ROUTES,
    normalize: toContactsInput,
  });

  return (
    <form
      noValidate
      aria-busy={props.busy}
      onSubmit={form.handleSubmit(
        async (values) => {
          if (!props.busy && (await save(values))) {
            unsaved.markSaved();
            props.onSaved?.();
          }
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
          className="min-h-11 w-full sm:w-auto sm:self-start"
          disabled={props.busy || !props.processing || !dirty}
        >
          {props.onSaved ? 'Сохранить и продолжить' : 'Сохранить контакты'}
        </Button>
      </fieldset>
    </form>
  );
};
