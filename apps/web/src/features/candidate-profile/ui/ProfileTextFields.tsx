import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';

import { Input, Textarea } from '@/shared/ui';

import type { ProfileFormValues } from '../model';
import { ProfileField } from './ProfileField';
import { ProfileTimezoneField } from './ProfileTimezoneField';

interface ProfileTextFieldsProps {
  register: UseFormRegister<ProfileFormValues>;
  errors: FieldErrors<ProfileFormValues>;
  control: Control<ProfileFormValues>;
}

const fields = [
  {
    key: 'headline',
    label: 'Заголовок профиля',
    placeholder: 'Go-разработчик',
    maxLength: 200,
  },
  { key: 'city', label: 'Город', placeholder: 'Казань', maxLength: 200 },
  {
    key: 'experienceYears',
    label: 'Опыт в годах',
    placeholder: '0',
    type: 'number',
    max: 50,
    step: 'any',
  },
  {
    key: 'salaryMinRub',
    label: 'Минимальная зарплата, ₽ в месяц',
    placeholder: 'Не указана',
    type: 'number',
    max: 1_000_000_000,
    step: 1,
  },
] as const;

export const ProfileTextFields = ({
  register,
  errors,
  control,
}: ProfileTextFieldsProps) => {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <ProfileField
            key={field.key}
            id={`profile-${field.key}`}
            label={field.label}
            error={errors[field.key]?.message}
          >
            <Input
              id={`profile-${field.key}`}
              {...register(field.key)}
              placeholder={field.placeholder}
              {...('maxLength' in field
                ? { maxLength: field.maxLength }
                : {
                    type: field.type,
                    min: 0,
                    max: field.max,
                    step: field.step,
                  })}
              aria-invalid={!!errors[field.key]}
              aria-describedby={
                errors[field.key] ? `profile-${field.key}-error` : undefined
              }
            />
          </ProfileField>
        ))}
        <ProfileTimezoneField control={control} />
      </div>
      <ProfileField
        id="profile-summary"
        label="О себе"
        error={errors.summary?.message}
      >
        <Textarea
          id="profile-summary"
          rows={6}
          maxLength={10000}
          {...register('summary')}
          aria-invalid={!!errors.summary}
          aria-describedby={
            errors.summary ? 'profile-summary-error' : undefined
          }
        />
      </ProfileField>
    </>
  );
};
