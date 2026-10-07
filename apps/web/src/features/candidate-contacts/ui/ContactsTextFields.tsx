import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { Input, Label } from '@/shared/ui';

import type { ContactsFormValues } from '../model';

const fields = [
  {
    name: 'fullName',
    label: 'ФИО',
    type: 'text',
    autoComplete: 'name',
    placeholder: 'Иван Иванов',
  },
  {
    name: 'email',
    label: 'Email для связи',
    type: 'email',
    autoComplete: 'email',
    placeholder: 'name@example.com',
  },
  {
    name: 'phone',
    label: 'Телефон',
    type: 'tel',
    autoComplete: 'tel',
    placeholder: '+7 999 123-45-67',
  },
  {
    name: 'telegram',
    label: 'Telegram',
    type: 'text',
    autoComplete: 'off',
    placeholder: '@username',
  },
] as const;

interface ContactsTextFieldsProps {
  register: UseFormRegister<ContactsFormValues>;
  errors: FieldErrors<ContactsFormValues>;
}

export const ContactsTextFields = ({
  register,
  errors,
}: ContactsTextFieldsProps) => (
  <div className="grid min-w-0 gap-4 sm:grid-cols-2">
    {fields.map((field) => {
      const id = `contacts-${field.name}`;
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
            aria-describedby={error ? `${id}-error` : undefined}
          />
          {error && (
            <p
              id={`${id}-error`}
              role="alert"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </div>
      );
    })}
  </div>
);
