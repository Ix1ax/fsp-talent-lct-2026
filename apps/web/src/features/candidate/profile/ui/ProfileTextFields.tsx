import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';

import { CANDIDATE_ELEMENT_IDS } from '@/shared/contants';
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
            id={CANDIDATE_ELEMENT_IDS.profile[field.key].input}
            errorId={CANDIDATE_ELEMENT_IDS.profile[field.key].error}
            label={field.label}
            error={errors[field.key]?.message}
          >
            <Input
              id={CANDIDATE_ELEMENT_IDS.profile[field.key].input}
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
                errors[field.key]
                  ? CANDIDATE_ELEMENT_IDS.profile[field.key].error
                  : undefined
              }
            />
          </ProfileField>
        ))}
        <ProfileTimezoneField control={control} />
      </div>
      <ProfileField
        id={CANDIDATE_ELEMENT_IDS.profile.summary.input}
        errorId={CANDIDATE_ELEMENT_IDS.profile.summary.error}
        label="О себе"
        error={errors.summary?.message}
      >
        <Textarea
          id={CANDIDATE_ELEMENT_IDS.profile.summary.input}
          rows={8}
          placeholder="Какие задачи вы решали, с какими технологиями работали и чем хотите заниматься дальше"
          maxLength={10000}
          {...register('summary')}
          aria-invalid={!!errors.summary}
          aria-describedby={
            errors.summary
              ? CANDIDATE_ELEMENT_IDS.profile.summary.error
              : undefined
          }
        />
      </ProfileField>
    </>
  );
};
