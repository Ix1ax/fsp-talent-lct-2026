import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { CANDIDATE_ELEMENT_IDS } from '@/shared/contants';
import { FieldMessage, Input, Label } from '@/shared/ui';

import { CONTACT_FIELDS, type ContactsFormValues } from '../model';

interface ContactsTextFieldsProps {
  register: UseFormRegister<ContactsFormValues>;
  errors: FieldErrors<ContactsFormValues>;
}

export const ContactsTextFields = ({
  register,
  errors,
}: ContactsTextFieldsProps) => {
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      {CONTACT_FIELDS.map((field) => {
        const { input: id, error: errorId } =
          CANDIDATE_ELEMENT_IDS.contacts[field.name];
        const error = errors[field.name]?.message;
        return (
          <div key={field.name} className="flex min-w-0 flex-col gap-2">
            <Label htmlFor={id}>{field.label}</Label>
            <Input
              {...register(field.name)}
              id={id}
              type={field.type}
              autoComplete={field.autoComplete}
              placeholder={field.placeholder}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
            />
            <FieldMessage id={errorId} message={error} />
          </div>
        );
      })}
    </div>
  );
};
